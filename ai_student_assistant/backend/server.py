from flask import Flask, request, jsonify, redirect
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import hashlib, secrets, os
import uuid
from flask_mail import Mail, Message
from datetime import datetime, timezone, timedelta
from flask import make_response
import re
from dotenv import load_dotenv
from openai import OpenAI
import fitz #PyMuPDF pentru extragere continut din PDF
from docx import Document
from werkzeug.utils import secure_filename 
from flask import session #pentru ca ai-ul sa retina contextul rezumatului pe care il facem si sa raspunda la intrebari bazate pe el
from fpdf import FPDF
import json
from difflib import SequenceMatcher
import base64
import requests
from functools import wraps
from flask_socketio import SocketIO, join_room, leave_room, emit
import random, string
from sqlalchemy import func

#Incarcare variabile din .env
load_dotenv()



#Setare cheie OpenAI
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Flask app initializaton
app = Flask(__name__, static_url_path='/static', static_folder='static')
socketio = SocketIO(app, cors_allowed_origins="https://www.fallnik.com", async_mode='eventlet')
CORS(app, supports_credentials=True, origins=["https://www.fallnik.com"])               #Accepta cereri de pe alte domenii (adica frontend)

app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024 #50MB

app.secret_key = os.getenv("SECRET_KEY", "fallback-secret") #adaugam o cheie de sesiune (pentru ai-ul care va retine contextul rezumatelor facute in FallnikAI)



# Setam calea catre baza de date SQLite
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(BASE_DIR, 'fallnik.db')

# Configuram SQLAlchemy cu baza de date SQLite 
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initializam obiectul SQLAlchemy
db = SQLAlchemy(app)

# Model User (tabelul din baza de date)
class User(db.Model):
    id = db.Column(db.Integer, primary_key = True)
    username = db.Column(db.String(80), unique=True, nullable = False)
    email = db.Column(db.String(120), unique = True, nullable = False)
    salt = db.Column(db.String(64), nullable = False)
    password_hash = db.Column(db.String(64), nullable = False)
    is_confirmed = db.Column(db.Boolean, default = False)
    confirmation_token = db.Column(db.String(64), unique = True)
    reset_token = db.Column(db.String(64), unique = True)
    reset_token_expiry = db.Column(db.DateTime)
    avatar_url = db.Column(db.String, nullable = True)
    spotify_access_token = db.Column(db.String, nullable=True)
    spotify_refresh_token = db.Column(db.String, nullable=True)
    spotify_token_expiry = db.Column(db.DateTime, nullable=True)



class UserData(db.Model):
    id = db.Column(db.Integer, primary_key = True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), unique=True, nullable=False
                        )
    messages = db.Column(db.Text)
    summary = db.Column(db.Text)
    file_name = db.Column(db.String)
    quiz_data = db.Column(db.Text)
    quiz_answers = db.Column(db.Text)
    quiz_results = db.Column(db.Text)
    download_url = db.Column(db.String)

    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))



class SessionMessage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    session_code = db.Column(db.String(10), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    text = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user = db.relationship("User", backref="session_messages")


class Session(db.Model):
    code = db.Column(db.String(6), primary_key=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))



class CalendarEvent(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    date = db.Column(db.Date, nullable=False)

    user = db.relationship("User", backref="calendar_events")


class UserActivity(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    activity_type = db.Column(db.String(64), nullable=False)
    details = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default = lambda: datetime.now(timezone.utc))

    user = db.relationship("User", backref="activities")

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get("user_id"):
            return jsonify({"error":"Unauthorized"}),401
        return f(*args, **kwargs)
    return decorated_function


# Hashing
def hash_password(password, salt):
    return hashlib.sha256((salt+password).encode('utf-8')).hexdigest()
    #se combina parola cu salt-ul si se aplica SHA-256


#salvare last activity al userului
def log_activity(user_id, activity_type, details=None):
    act = UserActivity(user_id=user_id, activity_type=activity_type, details=details)
    db.session.add(act)
    db.session.commit()


# Configurare server SMTP (PENTRU MAIL, folosesc gmail)
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER')

mail = Mail(app)



# Register
@app.route('/api/register', methods = ['POST'])
def register():
    data = request.get_json()
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    # validare username
    if not re.fullmatch(r'[a-zA-Z0-9.]+', username):
        return jsonify({'error' : 'Username may only contain letters, numbers and dots'}), 400

    #Verificam daca toate campurile au fost completate
    if not username or not email or not password:
        return jsonify({'error': 'Missing fields'}), 400
    
    #Verificam daca username sau email exista deja
    if User.query.filter((User.username == username) | (User.email == email)).first():
        return jsonify({'error' : 'Username or email already exists'}), 409
    
    #generam un salt random pentru fiecare utilizator
    salt = secrets.token_hex(16)

    #facem hash la parola+salt
    password_hash = hash_password(password, salt)

    #token-ul de confirmare care va fi trimis prim mail pentru validarea inregistrarii
    confirmation_token = uuid.uuid4().hex

    #cream noul utilizator si il adaugam in baza de date
    new_user = User(
        username=username, 
        email=email, 
        salt=salt, 
        password_hash = password_hash,
        is_confirmed = False,
        confirmation_token = confirmation_token)
    db.session.add(new_user)
    db.session.commit()

    # Link de confirmare (vei modifica când e pe domeniul real)
    confirm_url = f"https://www.fallnik.com/confirm/{confirmation_token}"

    #Constructie mesaj
    msg = Message("Confirm your Fallnik account", recipients = [email])
    msg.body = f"Hello {username}, \n\nClick the link below to confirm your account:\n{confirm_url}\n\nIf you didn't register, please ignore this email."

    try:
        mail.send(msg)
        print(f"Confirmation email sent to {email}")
    except Exception as e:
        print(f"Error sending confirmation email: {e}")

    return jsonify({'message' : 'Username registered successfully'}), 201





@app.route('/api/confirm/<token>', methods = ['GET'])
def confirm_email(token):
    user = User.query.filter_by(confirmation_token = token).first()

    if not user:
        return jsonify({'error': 'Invalid or expired confirmation token'}), 404
    
    if user.is_confirmed:
        return jsonify({'message': 'Account already confirmed'}), 200
    
    user.is_confirmed = True

    db.session.commit()
    return jsonify({'message': 'Account confirmed successfully'}), 200




# Login
@app.route('/api/login', methods = ['POST'])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    #cautam utilizatorul dupa username
    user = User.query.filter_by(username = username).first()

    #daca nu exista utilizatorul
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401
    
    if not user.is_confirmed:
        return jsonify({'error': 'Please confirm your email address to log in'}), 403
    
    #facem hash la parola introdusa cu salt-ul utilizatorului din DataBase
    hashed_input = hash_password(password, user.salt)

    #comparam hash-ul generat cu cel din baza de date
    if hashed_input != user.password_hash:
        return jsonify({'error' : 'Invalid credentials'}), 401
    
    session["user_id"] = user.id
    
    #LOGIN REUSIT - se seteaza cookie cu sesiunea
    response = make_response(jsonify({'message': 'Login successful'}))
    log_activity(user.id, "login")
    response.set_cookie(
        'session_id',
        user.username,
        httponly=True,
        secure=True,       # true pentru ca rulam pe https
        samesite='Lax',
        max_age=60*60*24     # 1 zi
    )
    response.set_cookie(
        'username',
        user.username,
        httponly=False,
        secure=True,
        samesite='Lax',
        max_age = 60*60*24
    )
    return response



#Endpoint pentru verificare sesiune
@app.route('/api/check-session', methods=['GET'])
def check_session():
    username = request.cookies.get('session_id')
    if not username: 
        return jsonify({'authenticated': False}), 401
    return jsonify({'authenticated': True, 'username' :username}), 200




# Pentru verificare username in timp real
@app.route('/api/check-username', methods = ['POST'])
def check_username():
    data = request.get_json()
    username = data.get("username")
    exists = User.query.filter_by(username=username).first() is not None
    return jsonify({'exists' : exists}), 200




# Pentru verificare email in timp real
@app.route('/api/check-email', methods=['POST'])
def check_email():
    data = request.get_json()
    email = data.get("email")
    exists = User.query.filter_by(email = email).first() is not None
    return jsonify({'exists' : exists}), 200



# pentru refresh instant la pagina de Almost There dupa ce dai register
@app.route('/api/is-confirmed', methods=['GET'])
def is_email_confirmed():
    email = request.args.get('email')
    if not email:
        return jsonify({'confirmed': False}), 400
    
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'confirmed':False}),404
    
    return jsonify({'confirmed': user.is_confirmed}), 200




#Pentru request de resetare a parolei
@app.route('/api/request-password-reset', methods= ['POST'])
def request_password_reset():
    data = request.get_json()
    email = data.get("email")

    user = User.query.filter_by(email = email).first()
    if not user:
        return jsonify({'error' : 'Email not found'}), 404
    
    token = uuid.uuid4().hex

    user.reset_token = token
    user.reset_token_expiry = datetime.now(timezone.utc) + timedelta(minutes=30)
    db.session.commit()

    reset_url = f"https://www.fallnik.com/reset-password/{token}"
    msg = Message("Fallnik: reset your password", recipients=[email])
    msg.body = f"Click the link below to reset your password:\n\n{reset_url}\n\nThis link will expire in 1 hour."

    try:
        mail.send(msg)
        return jsonify({'message': 'Reset email sent successfully'}), 200
    except Exception as e:
        return jsonify({'error': f'Failed to send email: {str(e)}'}), 500
    




#Pentru resetarea parolei
@app.route('/api/reset-password/<token>', methods = ['POST'])
def reset_password(token):
    data = request.get_json()
    new_password = data.get("password")

    if not new_password:
        return jsonify({'error':'Password is required'}), 400
    
    user = User.query.filter_by(reset_token = token).first()

    if not user or not user.reset_token_expiry:
        return jsonify({'error': 'Invalid or expired token'}), 404
    
    #convertire token din DB in aware datetime
    expiry = user.reset_token_expiry.replace(tzinfo=timezone.utc)
    if expiry < datetime.now(timezone.utc):
        return jsonify({'error': 'Expired token'}), 403
    
    #Generare de salt nou si hash-uire pentru parola noua
    new_salt = secrets.token_hex(16)
    new_hash = hash_password(new_password, new_salt)

    user.salt = new_salt
    user.password_hash = new_hash
    user.reset_token = None
    user.reset_token_expiry = None #invalidam token-ul

    db.session.commit()

    return jsonify({'message' : 'Password reset successfully'}), 200





#Logout (stergere cookie)
@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    response = make_response(jsonify({'message':'Logged out'}))
    response.set_cookie('session_id', '' , expires = 0)
    return response
    




#Salvare date (chat, summaries, etc)
@app.route("/api/user-data", methods=["GET"])
@login_required
def get_user_data():
    user_id = session.get("user_id")
    data = UserData.query.filter_by(user_id = user_id).first()

    if not data:
        return jsonify({})
    
    return jsonify({
        "messages" : json.loads(data.messages) if data.messages else [],
        "summary" : data.summary,
        "file_name": data.file_name,
        "quiz_data" : json.loads(data.quiz_data) if data.quiz_data else [],
        "quiz_answers": json.loads(data.quiz_answers) if data.quiz_answers else [],
        "quiz_results": json.loads(data.quiz_results) if data.quiz_results else [],
        "download_url" : data.download_url,
    })

@app.route("/api/user-data", methods=["POST"])
@login_required
def save_user_data():
    try:
        user_id = session.get("user_id")
        payload = request.json

        data = UserData.query.filter_by(user_id = user_id).first()

        print("Saving user data for user_id:", user_id)
        print("Payload keys:", payload.keys() if payload else "No payload")

        if not data:
            data = UserData(user_id = user_id)

        data.messages = json.dumps(payload.get("messages", []))
        data.summary = payload.get("summary", "")
        data.file_name = payload.get("file_name", "")
        data.quiz_data = json.dumps(payload.get("quiz_data", []))
        data.quiz_answers = json.dumps(payload.get("quiz_answers", []))
        data.quiz_results = json.dumps(payload.get("quiz_results", {}))
        data.download_url = payload.get("download_url", "")

        db.session.add(data)
        db.session.commit()

        return jsonify({"success": True})
    
    except Exception as e:
        print("Error saving user data:", e)
        return jsonify({"error": str(e)}), 500
    

@app.route('/api/user-id', methods=['GET'])
@login_required
def get_user_id():
    user_id = session.get("user_id")
    if user_id is None:
        return jsonify({'error' : 'Unauthorized'}), 401
    return jsonify({'user_id' : user_id})


#Endpoint pagina ai
@app.route('/api/ask-ai', methods=['POST'])
def ask_ai():
    print("Session keys on ask-ai:", list(session.keys()))
    data=request.get_json()
    question= data.get("question")

    if not question:
        return jsonify({'error' : 'Question is required'}), 400
    
    #Verificam daca exista o lectie salvata anterior
    lesson_context = session.get("lesson_context")

    #Construim mesajele pentru AI
    messages = [
        {
            "role" : "system",
            "content" : "You are Fallnik, an intelligent AI assistant designed to help students understand uploaded lessons and answer their questions clearly and supportively.",
        }
    ]

    if lesson_context:
        messages.append({
            "role" : "user",
            "content" : f"This is the lesson context: \n{lesson_context}"
        })

    messages.append({
        "role":"user",
        "content": (
            "Please answer the following question in the **same language** used in the question. "
            "Answer in a structured and easy-to-read format. "
            "Use Markdown formatting: use **bold titles**, bullet points (•), numbered lists if needed, and leave **empty lines between sections** for better clarity. "
            "Do **not write in a single paragraph**, and **always break long explanations into parts**. "
            f"\n\nQuestion: {question}"        
        )
    })
    
    try:
        response = client.chat.completions.create(
            model = "gpt-4-turbo",
            messages=messages,
            max_tokens = 1000,
            temperature = 0.7
        )

        answer = response.choices[0].message.content.strip()
        return jsonify({'answer' : answer})
    
    except Exception as e:
        print("OpenAI Error: ", e)
        return jsonify({'error': 'Ai request failed'}), 500
    




#Upload fisiere
@app.route('/api/upload-material', methods=['POST'])
def upload_material():
    print("Session keys on upload:", list(session.keys()))
    file= request.files.get('file')

    if not file:
        return jsonify({'error': 'No file uploaded'}), 400
    
    filename = secure_filename(file.filename)
    extension = filename.rsplit('.', 1)[-1].lower()

    try:
        if extension == 'pdf':
            doc = fitz.open(stream=file.read(), filetype="pdf")
            text="\n".join(page.get_text() for page in doc)

        elif extension in ['doc', 'docx']:
            docx_file = Document(file)
            text = "\n".join(p.text for p in docx_file.paragraphs)

        elif extension == 'txt':
            text = file.read().decode('utf-8')

        else:
            return jsonify({'error': 'Unsupported file type'}), 400
        
        if len(text.strip()) < 20:
            return jsonify({'error' : 'File seems empty or unreadable'}), 400
        
        #Trimitere catre OpenAI pentru rezumat
        prompt = (
            "Please summarize the following material in the **same language** it is written in. "
            "Organize the summary using a **bullet points** (e.g., •), where each idea or key point is on its own line. "
            "Keep it concise, but do not omit technical or essential educational content. "
            "Make sure the summary is structured and useful for a student trying to learn from this material.\n\n" + text[:10000]
        )

        response = client.chat.completions.create(
            model="gpt-4-turbo",
            messages=[
                {"role": "system", "content": "You are Fallnik, an intelligent assistant designed to help students learn better. "
                 "Always respond in the **same language** as the inpus unless explicitly told otherwise."},
                {"role":"user", "content":prompt}
            ],
            max_tokens=900,
            temperature=0.6
        )

        summary = response.choices[0].message.content.strip()
        session['lesson_context'] = summary #stocam rezumatul in sesiune

    #Extragem subiectul principal al rezumatului
        try:
            title_response = client.chat.completions.create(
                model= "gpt-4-turbo",
                messages=[
                    {
                        "role" : "system",
                        "content" : "Extract only the main topic or subject from this summary in a few words. Respond only with the topic."
                    },
                    {
                        "role" : "user",
                        "content" : summary
                    }
                ],
                max_tokens = 20,
                temperature=0.3
            )

            topic = title_response.choices[0].message.content.strip().strip('"')

        except Exception as e:
            print("Topic extraction failed: ", e)
            topic = "this lesson"    

        #Cream un PDF in care vom salva rezumatul si il vom oferi ca download
        pdf = FPDF()
        pdf.add_page()
        pdf.set_auto_page_break(auto=True, margin=15)

        #Font
        font_path = os.path.join(os.path.dirname(__file__), 'DejaVuSans.ttf')
        pdf.add_font('DejaVu', '', font_path, uni=True)
        pdf.add_font('DejaVu', 'B', font_path, uni=True)

        #Titlu cu topicul generat de AI
        pdf.set_font("DejaVu", 'B', size=16)
        pdf.cell(0, 10, f"Summary: {topic}", ln=True, align='C')
        pdf.ln(5)

        #Continut rezumat
        for line in summary.split('\n'):
            line = line.strip()
            if not line:
                continue
            if line.startswith("•"):
                pdf.set_font("DejaVu", 'B', size=12)
            else:
                pdf.set_font("DejaVu", '', size=11)
            pdf.multi_cell(0,6,line)
            pdf.ln(1)

        #Salvare cu nume unic
        filename = f"{uuid.uuid4().hex}_summary.pdf"
        save_dir = "/var/www/fallnik.com/html/static/summaries"
        os.makedirs(save_dir, exist_ok=True)
        file_path = os.path.join(save_dir, filename)
        pdf.output(file_path)

        #Link de download
        download_url = f"https://www.fallnik.com/static/summaries/{filename}"


        #Detectam limba rezumatului ca sa putem sa generam un raspuns al AI-ului in chatbot in limba in care rezumatul a fost scris
        try:
            language_detect = client.chat.completions.create(
                model="gpt-4-turbo",
                messages=[
                    {
                        "role" : "system",
                        "content" : "Detect the language of the following summary. Respond with the language name in English, e.g., 'Romanian', 'English', 'French'."
                    },
                    {
                        "role" : "user",
                        "content" : summary
                    }
                ],
                max_tokens = 10,
                temperature = 0
            )
            language = language_detect.choices[0].message.content.strip()
        except Exception as e:
            print("Language detection failed: ", e)
            language = "English"

        #Generam mesajul in limba detectata
        try:
            localized_prompt = (
                f"Generate a friendly and short follow-up message in {language}. "
                f"It should mention that the user has generated a summary about \"{topic}\" and ask if they have questions on this topic. "
                "Be natural and student-friendly. Do not include any explanations or translations."
            )

            chat_msg_resp = client.chat.completions.create(
                model="gpt-4-turbo",
                messages = [
                    {"role" : "system", "content" : "You are Fallnik, a helpful assistant that communicates with students in their own language."},
                    {"role" : "user" , "content" : localized_prompt}
                ],
                max_tokens = 60,
                temperature = 0.6
            )

            chat_message = chat_msg_resp.choices[0].message.content.strip()
        except Exception as e:
            print("Chat message generation failed: ", e)
            chat_message= f"I notice you generated a summary about **{topic}**. Do you have any questions on this topic?"

        user_id = session.get("user_id")
        log_activity(user_id, "upload", topic)

        return jsonify({
            'summary' : summary,
            'chat_message': chat_message,
            'download_url' : download_url,
            })
    
    except Exception as e:
        print("Upload/AI error: ", e)
        return jsonify({'error': 'Failed to process file'}), 500
    


#Generare quiz pentru testare    
@app.route('/api/generate-quiz', methods=['POST'])
def generate_quiz():
    data = request.get_json()
    quiz_type = data.get("quiz_type")   #multiple_choice sau open_ended
    summary = session.get("lesson_context")

    if not summary:
        return jsonify({'error' : 'No summary available in session'}), 400
    
    if quiz_type not in ["multiple_choice", "open_ended"]:
        return jsonify({'error' : 'Invalid quiz type'}), 400
    
    #Prompt adaptat in functie de tipul de quiz
    prompt = (
        f"From the following summarized lesson, generate one {'multiple choice' if quiz_type == 'multiple_choice' else 'open-ended'} question for each bullet point. "
        "All questions and answers must be in the **same language** as the summary text. "
    )

    if quiz_type == "multiple_choice":
        prompt +=(
            "Each question should have one correct answer and three plausible but incorrect options. "
            "Respond as a JSON list of objects in this format:\n"
            "[{\"question\": \"...\", \"options\": [\"...\", \"...\", \"...\", \"...\"], \"answer\": \"...\"}]\n\n"
        )
    else:
        prompt +=(
            "Provide the correct answer for each. "
            "Respond as a JSON list of objects in this format:\n"
            "[{\"question\": \"...\", \"answer\": \"...\"}]\n\n"
        )

    prompt += "Make sure all content is written in the same language as the summary.\n\n"
    prompt += f"Summary: \n{summary}"
    
    try:
        response = client.chat.completions.create(
            model="gpt-4-turbo",
            messages=[
                {
                    "role" : "system",
                    "content" : "You are Fallnik, a helpful student assistant that creates educational quizzez based on lesson summaries."
                },
                {
                    "role" : "user",
                    "content" : prompt
                }
            ],
            temperature=0.5,
            max_tokens=2000
        )

        quiz_data_raw = response.choices[0].message.content.strip()

        #pastram JSON-ul
        try:
            quiz_data = json.loads(quiz_data_raw)
        except json.JSONDecodeError:
            #in caz ca ai-ul a returnat text extra, extragem doar partea JSON
            quiz_data_raw = re.search(r'\[.*\]', quiz_data_raw, re.DOTALL)
            if quiz_data_raw:
                quiz_data = json.loads(quiz_data_raw.group())
            else:
                return jsonify({'error': 'AI response was not in valid JSON format'}), 500
            
        #minim 3 intrebari in quiz
        if len(quiz_data) < 3:
            return jsonify({'error' : 'Generated quiz is too short'}),400
        
        #Salvam quiz-ul si tipul in sesiune pentru utilizare ulterioara
        session['generated_quiz'] = quiz_data
        session['quiz_type'] = quiz_type

        user_id = session.get("user_id")
        quiz_type_label = "Multiple choice" if quiz_type == "multiple_choice" else "Open ended"
        log_activity(user_id, "generate_quiz", quiz_type_label)
            
        return jsonify({'quiz' : quiz_data, 'quiz_type' : quiz_type})
    
    except Exception as e:
        print("Quiz generation error: ", e)
        return jsonify({'error': 'Failed to generate quiz'}), 500



#Functie verificare similaritate raspuns user din open-ended quiz cu raspunsul corect        
def is_similar(a, b, threshold=0.75):
    return SequenceMatcher(None, a.lower().strip(), b.lower().strip()).ratio() >= threshold


#Verificare quiz
@app.route('/api/verify-quiz', methods=['POST'])
def verify_quiz():
    user_answers = request.get_json().get("answers")
    quiz_data = session.get("generated_quiz")
    quiz_type = session.get("quiz_type")

    if not quiz_data or not quiz_type:
        return jsonify({'error' : 'No quiz in session.'}), 400
    
    if not user_answers or not isinstance(user_answers, list) or len(user_answers) != len(quiz_data):
        return jsonify({'error' : 'Invalid or incomplete answers'}), 400

    results = []
    correct_count = 0

    for i, user_answer in enumerate(user_answers):
        question_data = quiz_data[i]
        correct_answer = question_data.get("answer", "").strip()

        user_answer = (user_answer or "").strip()

        print("Received answers:", user_answers)
        print("Expected quiz:", quiz_data)

        #Pentru multiple_choice: comparare directa
        if quiz_type == "multiple_choice":
            is_correct = user_answer.strip() == correct_answer.strip()
        else:
            #Pentru open_ended comparare toleranta (lowercase, eliminare spatii)
            is_correct = is_similar(user_answer, correct_answer)

            #fallback AI semantic, verificam daca similaritatea e sub threshold
            if not is_correct:
                ai_check_prompt = (
                    f"You are an educational assistant. A student has answered an open-ended quiz question. "
                    f"Determine whether the student's answer is semantically equivalent to the correct one.\n\n"
                    f"Question: {question_data['question']}\n"
                    f"Correct answer: {correct_answer}\n"
                    f"Student's answer: {user_answer}\n\n"
                    "Respond with only 'yes' or 'no'."
                )

                try:
                    ai_resp = client.chat.completions.create(
                        model = "gpt-4-turbo",
                        messages=[{ "role": "user" , "content": ai_check_prompt}],
                        temperature = 0,
                        max_tokens = 5
                    )

                    ai_answer = ai_resp.choices[0].message.content.strip().lower()
                    if ai_answer.startswith("yes"):
                        is_correct = True

                except Exception as e:
                    print(f"[AI Semantic Check] Fallback failed: {e}")

        results.append({
            "question" : question_data["question"],
            "your_answer" : user_answer,
            "correct_answer" : correct_answer,
            "is_correct": is_correct
        })

        if is_correct:
            correct_count += 1

    user_id = session.get("user_id")
    log_activity(user_id, "finish_quiz", f"Scored {correct_count}/{len(quiz_data)}")

    score = f"{correct_count}/{len(quiz_data)}"
    return jsonify({
        'score' : score, 
        'correct' : correct_count,
        'total' : len(quiz_data),
        'results':results
        })

    


#Mesaj de welcome de la AI in chatbox
@app.route('/api/welcome-message', methods=['GET'])
def welcome_message():
    try:
        #incercam sa detectam limba din rezumatul anterior daca exista
        summary = session.get("lesson_context", "")
        detected_language = "English" #by default

        if summary:
            try:
                detect_response = client.chat.completions.create(
                    model = "gpt-3.5-turbo",
                    messages = [
                        {
                        "role" : "system",
                        "content" : "Detect the language of the following summary. Respond only with the language name in English, like 'Romanian', 'French', 'English'."
                        },
                        {
                            "role" : "user",
                            "content" : summary
                        }
                    ],
                    max_tokens=10,
                    temperature=0
                )
                detected_language = detect_response.choices[0].message.content.strip()
            except Exception as e:
                print("Language detection failed, fallback to English: ", e)
        
        #Prompt pentru mesaj personalizat in limba detectata
        prompt = (
            f"Imagine you are Fallnik, a helpful student assistant AI. "
            f"Write a short and friendly welcome message in {detected_language}. "
            f"Introduce yourself, be warm, and briefly explain that you can help the user learn better, summarize lesson documents and generate quizzez for knowledge evaluation. "
            f"Use a natural tone appropriate for students."
        )

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role":"user", "content":prompt}],
            max_tokens = 350,
            temperature=0.6
        )

        welcome_text = response.choices[0].message.content.strip()
        return jsonify({"message":welcome_text})
    except Exception as e:
        print("Welcome message generation failed: ", e)
        return jsonify({
            "message" : "Hello! I am Fallnik, your AI assistant. I can help you learn, i can summarize your lessons and help you evaluate yourself. Just give me your lesson material."
        })



#Resetare context lectie pentru AI bot
@app.route('/api/reset-lesson-context', methods=['POST'])
def reset_lesson_context():
    session.pop('lesson_context', None)
    return jsonify({'message' : 'Lesson context cleared'}), 200




#Spotify api
@app.route('/api/spotify/callback')
def spotify_callback():
    code = request.args.get('code')

    if not code:
        return jsonify({'error' : 'No code in callback'}), 400
    
    client_id = os.getenv("SPOTIFY_CLIENT_ID")
    client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
    redirect_uri = "https://www.fallnik.com/api/spotify/callback"

    auth_header = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()

    token_url = "https://accounts.spotify.com/api/token"
    payload = {
        "grant_type" : "authorization_code",
        "code" : code,
        "redirect_uri" : redirect_uri
    }
    headers = {
        "Authorization" : f"Basic {auth_header}",
        "Content-Type" : "application/x-www-form-urlencoded"
    }

    r = requests.post(token_url, data=payload, headers=headers)
    if r.status_code != 200:
        return jsonify({'error' : 'Failed to get token'}), 500
    
    tokens = r.json()

    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "User not logged in!"}), 401
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error":"User not found!"}), 404
    
    user.spotify_access_token = tokens['access_token']
    user.spotify_refresh_token = tokens['refresh_token']
    user.spotify_token_expiry = datetime.now(timezone.utc) + timedelta(seconds=tokens['expires_in'])

    db.session.commit()

    return redirect("https://www.fallnik.com/dashboard/music?spotify=connected")



def get_valid_spotify_access_token(user):
    if not user.spotify_access_token or not user.spotify_refresh_token or not user.spotify_token_expiry:
        return None
    
    expiry = user.spotify_token_expiry
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    #daca tokenul expira in 1 minute sau a expirat
    if expiry < datetime.now(timezone.utc) + timedelta(seconds=60):
        refreshed = refresh_spotify_token(user)
        if not refreshed:
            return None
    
    return user.spotify_access_token


def refresh_spotify_token(user):
    client_id = os.getenv("SPOTIFY_CLIENT_ID")
    client_secret = os.getenv('SPOTIFY_CLIENT_SECRET')
    token_url = "https://accounts.spotify.com/api/token"
    auth_header = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    payload = {
        "grant_type" : "refresh_token",
        "refresh_token" : user.spotify_refresh_token,
    }

    headers = {
        "Authorization" : f"Basic {auth_header}",
        "Content-Type" : "application/x-www-form-urlencoded"
    }

    r = requests.post(token_url, data=payload, headers=headers)
    if r.status_code != 200:
        print(f"Spotify refresh failed: {r.text}")
        return False
    tokens = r.json()
    user.spotify_access_token = tokens['access_token']

    #uneori la refresh, nu primim refresh_token nou - folosim pe cel vechi
    if 'refresh_token' in tokens:
        user.spotify_refresh_token = tokens['refresh_token']

    user.spotify_token_expiry = datetime.now(timezone.utc) + timedelta(seconds=tokens['expires_in'])
    db.session.commit()

    return True




#Spotify Logout
@app.route('/api/spotify/logout', methods=['POST'])
def spotify_logout():
    user_id = session.get('user_id')
    user = User.query.get(user_id)
    if user:
        user.spotify_access_token = None
        user.spotify_refresh_token = None
        db.session.commit()
    return jsonify({'success': True})


#Spotify Profile
@app.route('/api/spotify/profile', methods=['GET'])
def spotify_profile():
    user_id = session.get('user_id')
    user = User.query.get(user_id)

    if not user or not user.spotify_access_token:
        return jsonify({'error':'User not authenticated with Spotify'}), 401

    access_token = get_valid_spotify_access_token(user)

    if not access_token:
        return jsonify({'error' : 'User not authenticated with Spotify'}), 401
    
    headers = {
        "Authorization" : f"Bearer {access_token}"
    }

    r = requests.get("https://api.spotify.com/v1/me", headers=headers)

    if r.status_code != 200:
        return jsonify({'error' : 'Failed to fetch profile'}), 500
    
    return jsonify(r.json())



#Melodia curenta
@app.route('/api/spotify/currently-playing', methods=['GET'])
def current_track():
    user_id = session.get('user_id')
    user = User.query.get(user_id)

    if not user or not user.spotify_access_token:
        return jsonify({'error':'User not authenticated with Spotify'}), 401

    access_token = get_valid_spotify_access_token(user)

    if not access_token:
        return jsonify({'error' : 'User not authenticated with Spotify'}), 401
    
    headers ={
        "Authorization" : f"Bearer {access_token}"
    }

    response = requests.get("https://api.spotify.com/v1/me/player/currently-playing", headers=headers)

    if response.status_code == 204:
        return jsonify({'message' : 'No track currently playing'}), 200
    
    if response.status_code != 200:
        return jsonify({'error': 'Failed to fetch current track'}), 500 
    
    try:
        return jsonify(response.json())
    except Exception as e:
        return jsonify({'error' : 'Invalid JSON from Spotify'}), 500
    



#Spotify playlists
@app.route('/api/spotify/playlists', methods=['GET'])
def spotify_playlists():

    user_id = session.get('user_id')
    user = User.query.get(user_id)

    if not user or not user.spotify_access_token:
        return jsonify({'error':'User not authenticated with Spotify'}), 401

    access_token = get_valid_spotify_access_token(user)

    if not access_token:
        return jsonify({'error' : 'User not authenticated with Spotify'}), 401
    
    headers = {
        "Authorization" : f"Bearer {access_token}"
    }

    playlists = []
    url = "https://api.spotify.com/v1/me/playlists"

    while url:
        res = requests.get(url, headers=headers)
        if res.status_code != 200:
            return jsonify({'error' : 'Failed to fetch playlists'}), 500
        
        data = res.json()
        playlists.extend(data.get("items", []))
        url = data.get("next")
    
    return jsonify({"items" : playlists})




#Afisarea melodiilor din playlisturi in pagina music
@app.route('/api/spotify/playlist/<playlist_id>/tracks', methods=['GET'])
def get_playlist_tracks(playlist_id):
    user_id = session.get('user_id')
    user = User.query.get(user_id)

    if not user or not user.spotify_access_token:
        return jsonify({'error':'User not authenticated with Spotify'}), 401

    access_token = get_valid_spotify_access_token(user)

    if not access_token:
        return jsonify({'error' : 'User not authenticated with Spotify'}), 401
    
    headers ={
        "Authorization" : f"Bearer {access_token}"
    }

    url = f"https://api.spotify.com/v1/playlists/{playlist_id}/tracks"
    response = requests.get(url, headers=headers)

    if response.status_code != 200:
        return jsonify({'error' : 'Failed to fetch tracks'}), response.status_code
    
    return jsonify(response.json())




#Redare melodie direct din pagina music
@app.route("/api/spotify/play-track", methods=["PUT"])
def play_track():
    user_id = session.get('user_id')
    user = User.query.get(user_id)

    if not user or not user.spotify_access_token:
        return jsonify({'error':'User not authenticated with Spotify'}), 401

    access_token = get_valid_spotify_access_token(user)

    if not access_token:
        return jsonify({'error' : 'User not authenticated with Spotify'}), 401
    
    data = request.get_json()
    track_uri = data.get("uri")

    if not track_uri:
        return jsonify({'error' : 'No track URI provided'}), 400
    
    headers ={
        "Authorization" : f"Bearer {access_token}",
        "Content-Type" : "application/json"
    }

    payload = {
        "uris" : [track_uri]
    }

    response = requests.put("https://api.spotify.com/v1/me/player/play", headers=headers, json=payload)

    if response.status_code == 204:
        return jsonify({'message' : 'Track playing'}), 200
    else:
        return jsonify({"error" : "Failed to start playback", "details" : response.json()}), 500
    


#Pentru Pauza la melodii
@app.route("/api/spotify/pause", methods=["PUT"])
def pause_track():
    user_id = session.get('user_id')
    user = User.query.get(user_id)

    if not user or not user.spotify_access_token:
        return jsonify({'error':'User not authenticated with Spotify'}), 401

    access_token = get_valid_spotify_access_token(user)

    if not access_token:
        return jsonify({'error' : 'User not authenticated with Spotify'}), 401
    
    headers ={
        "Authorization" : f"Bearer {access_token}"
    }

    response = requests.put("https://api.spotify.com/v1/me/player/pause", headers=headers)

    if 200 <= response.status_code < 300:
        return jsonify({'message' : 'Playback paused'}), 200
    else:
        return jsonify({"error" : "Failed to pause playback"}), 500
    


#Pentru Optiune de next song la melodii
@app.route("/api/spotify/next", methods=["POST"])
def next_track():
    user_id = session.get('user_id')
    user = User.query.get(user_id)

    if not user or not user.spotify_access_token:
        return jsonify({'error':'User not authenticated with Spotify'}), 401

    access_token = get_valid_spotify_access_token(user)

    if not access_token:
        return jsonify({'error' : 'User not authenticated with Spotify'}), 401
    
    headers ={
        "Authorization" : f"Bearer {access_token}"
    }

    response = requests.post("https://api.spotify.com/v1/me/player/next", headers=headers)

    if 200 <= response.status_code < 300:
        return jsonify({'message' : 'Skipped to next track'}), 200
    else:
        return jsonify({"error" : "Failed to skip track"}), 500
    


#Pentru optiune de previous song la melodii
@app.route("/api/spotify/previous", methods=["POST"])
def previous_track():
    user_id = session.get('user_id')
    user = User.query.get(user_id)

    if not user or not user.spotify_access_token:
        return jsonify({'error':'User not authenticated with Spotify'}), 401

    access_token = get_valid_spotify_access_token(user)

    if not access_token:
        return jsonify({'error' : 'User not authenticated with Spotify'}), 401
    
    headers ={
        "Authorization" : f"Bearer {access_token}"
    }

    response = requests.post("https://api.spotify.com/v1/me/player/previous", headers=headers)

    if 200 <= response.status_code < 300:
        return jsonify({'message' : 'Skipped to previous track'}), 200
    else:
        return jsonify({"error" : "Failed to skip to previous track"}), 500




#Status player
@app.route('/api/spotify/player-status', methods=['GET'])
def player_status():
    user_id = session.get('user_id')
    user = User.query.get(user_id)

    if not user or not user.spotify_access_token:
        return jsonify({'error':'User not authenticated with Spotify'}), 401

    access_token = get_valid_spotify_access_token(user)

    if not access_token:
        return jsonify({'error' : 'User not authenticated with Spotify'}), 401
    
    headers ={
        "Authorization" : f"Bearer {access_token}"
    }

    response = requests.get("https://api.spotify.com/v1/me/player", headers=headers)

    if response.status_code != 200:
        return jsonify({'error' : 'Failed to get player status'}), 500
    
    return jsonify(response.json())


#Resume
@app.route("/api/spotify/resume", methods=["PUT"])
def resume_track():
    user_id = session.get('user_id')
    user = User.query.get(user_id)

    if not user or not user.spotify_access_token:
        return jsonify({'error':'User not authenticated with Spotify'}), 401

    access_token = get_valid_spotify_access_token(user)

    if not access_token:
        return jsonify({'error' : 'User not authenticated with Spotify'}), 401
    
    headers ={
        "Authorization" : f"Bearer {access_token}"
    }

    response = requests.put("https://api.spotify.com/v1/me/player/play", headers=headers)

    if 200 <= response.status_code < 300:
        return jsonify({'message' : 'Playback resumed'}), 200
    else:
        return jsonify({'error' : 'Failed to resume playback'}), 500




#Liked Songs
@app.route("/api/spotify/liked-tracks", methods=["GET"])
def liked_tracks():
    user_id = session.get('user_id')
    user = User.query.get(user_id)

    if not user or not user.spotify_access_token:
        return jsonify({'error':'User not authenticated with Spotify'}), 401

    access_token = get_valid_spotify_access_token(user)

    if not access_token:
        return jsonify({'error' : 'User not authenticated with Spotify'}), 401
    
    headers ={
        "Authorization" : f"Bearer {access_token}"
    }

    url = "https://api.spotify.com/v1/me/tracks?limit=50"
    response = requests.get(url, headers=headers)

    if response.status_code != 200:
        return jsonify({'error' : 'Failed to fetch liked tracks'}), 500
    
    return jsonify(response.json())




#Recently played
@app.route("/api/spotify/recent-tracks", methods=["GET"])
def recent_tracks():
    user_id = session.get('user_id')
    user = User.query.get(user_id)

    if not user or not user.spotify_access_token:
        return jsonify({'error':'User not authenticated with Spotify'}), 401

    access_token = get_valid_spotify_access_token(user)

    if not access_token:
        return jsonify({'error' : 'User not authenticated with Spotify'}), 401
    
    headers ={
        "Authorization" : f"Bearer {access_token}"
    }

    url = "https://api.spotify.com/v1/me/player/recently-played?limit=30"
    response = requests.get(url, headers=headers)

    if response.status_code != 200:
        return jsonify({'error' : 'Failed to fetch recent tracks'}), 500
    
    return jsonify(response.json())




#Search Songs
@app.route("/api/spotify/search", methods=["GET"])
def search_spotify():
    user_id = session.get('user_id')
    user = User.query.get(user_id)

    if not user or not user.spotify_access_token:
        return jsonify({'error':'User not authenticated with Spotify'}), 401

    access_token = get_valid_spotify_access_token(user)

    if not access_token:
        return jsonify({'error' : 'User not authenticated with Spotify'}), 401
    
    query = request.args.get("q")
    
    headers ={
        "Authorization" : f"Bearer {access_token}"
    }

    params = {
        "q" : query,
        "type" : "track",
        "limit" : 20
    }
    
    response = requests.get("https://api.spotify.com/v1/search", headers=headers, params=params)

    if response.status_code != 200:
        return jsonify({'error' : 'Failed to search results'}), 500
    
    return jsonify(response.json())





@app.route("/api/spotify/transfer-playback", methods=["PUT"])
def transfer_playback():
    user_id = session.get('user_id')
    user = User.query.get(user_id)

    if not user or not user.spotify_access_token:
        return jsonify({'error':'User not authenticated with Spotify'}), 401

    access_token = get_valid_spotify_access_token(user)

    if not access_token:
        return jsonify({'error' : 'User not authenticated with Spotify'}), 401
    
    data = request.get_json()
    device_id = data.get("device_id")

    if not device_id:
        return jsonify({'error' : 'Missing access or device_id'}), 400
    
    headers ={
        "Authorization" : f"Bearer {access_token}",
        "Content-Type" : "application/json"
    }

    payload = {
        "device_ids" : [device_id],
        "play" : True
    }

    r = requests.put("https://api.spotify.com/v1/me/player", headers=headers, json = payload)

    if r.status_code == 204:
        return jsonify({"message" : "Playback transferred"}), 200
    else:
        return jsonify({"error" : "Transfer failed"}), 500
    




#transmitere token catre frontend
@app.route('/api/spotify/token', methods=['GET'])
def get_spotify_token():
    user_id = session.get('user_id')
    user = User.query.get(user_id)

    if not user or not user.spotify_access_token:
        return jsonify({'error':'User not authenticated with Spotify'}), 401

    access_token = get_valid_spotify_access_token(user)

    if not access_token:
        return jsonify({'error' : 'User not authenticated with Spotify'}), 401
    
    return jsonify({'token' : access_token})




#upload-avatar de profil
@app.route('/api/upload-avatar', methods=['POST'])
@login_required
def upload_avatar():
    if 'avatar' not in request.files:
        return jsonify({"error" : "No file part"}), 400
    
    file = request.files['avatar']
    if file.filename == '':
        return jsonify({"error" : "No selected files"}), 400
    
    #salvare fisier
    username = request.cookies.get("session_id")
    user = User.query.filter_by(username=username).first()

    filename = secure_filename(f"{username}_avatar.png")
    full_path = os.path.join("/var/www/fallnik.com/html/static/avatars", filename)
    relative_url=f"/static/avatars/{filename}"

    try:
        file.save(full_path)
        user.avatar_url = relative_url
        db.session.commit()
        return jsonify({"avatar_url": relative_url}), 200
    except Exception as e:
        return jsonify({"error":str(e)}), 500




#user info
@app.route('/api/user-info', methods=['GET'])
@login_required
def user_info():
    username = request.cookies.get("session_id")
    user = User.query.filter_by(username=username).first()

    if not user:
        return jsonify({"error" : "User not found"}), 404
    
    return jsonify({
        "username" : user.username,
        "email" : user.email,
        "avatar_url" : user.avatar_url or "/static/avatars/default-avatar.png"
    })



@app.route('/api/delete-account', methods=['DELETE'])
@login_required
def delete_account():
    username = request.cookies.get("session_id")
    user = User.query.filter_by(username=username).first()
    
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Poți adăuga aici ștergerea fișierului avatar dacă vrei
    db.session.delete(user)
    db.session.commit()

    response = jsonify({"message": "Account deleted"})
    response.set_cookie("session_id", "", expires=0)
    return response





#Partea de Sessions
#Upload material per sesiune
@app.route("/api/sessions/<code>/material", methods=["POST"])
@login_required
def upload_session_material(code):
    if "file" not in request.files:
        return jsonify({"error" : "No file provided"}), 400
    
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error" : "Empty filename"}), 400
    
    allowed_exts = {"pdf", "docx", "txt"}
    ext = file.filename.rsplit(".", 1)[-1].lower()

    if ext not in allowed_exts:
        return jsonify({"error" : "Unsupported file type"}), 400
    
    filename = secure_filename(file.filename)
    save_dir = f"/var/www/fallnik.com/html/static/session-files/{code}"
    os.makedirs(save_dir, exist_ok=True)

    file_path = os.path.join(save_dir, filename)
    file.save(file_path)

    file_url = f"https://www.fallnik.com/static/session-files/{code}/{filename}"
    return jsonify({"file_url": file_url})


@app.route("/api/sessions/<code>/material", methods=["GET"])
@login_required
def get_session_material(code):
    dir_path = f"/var/www/fallnik.com/html/static/session-files/{code}"

    if not os.path.exists(dir_path):
        return jsonify({"file_url": None}),200
    
    files = os.listdir(dir_path)
    if not files:
        return jsonify({"file_url": None}), 200
    
    filename = files[0]
    file_url = f"https://www.fallnik.com/static/session-files/{code}/{filename}"

    return jsonify({"file_url": file_url})



@app.route("/api/sessions/<code>/chat", methods=["POST"])
@login_required
def post_chat_message(code):
    data = request.get_json()
    text = data.get("text", "").strip()
    user_id = session.get("user_id")

    if not user_id or not text:
        return jsonify({"error" : "Invalid input"}), 400
    
    msg = SessionMessage(
            session_code=code,
            user_id=user_id,
            text=text
        )
    db.session.add(msg)
    db.session.commit()

    user = User.query.get(user_id)
    socketio.emit('new-chat-message',{
        'user' : user.username,
        'avatar_url' : user.avatar_url or "/static/avatars/default-avatar.png",
        'text' : text,
        'timestamp' : msg.timestamp.isoformat()
    }, room=code)

    return jsonify({"success": True})


@app.route("/api/sessions/<code>/chat", methods=["GET"])
@login_required
def get_chat_messages(code):
    messages = (
        SessionMessage.query
        .filter_by(session_code=code)
        .order_by(SessionMessage.timestamp.asc())
        .limit(100)
        .all()
    )

    result = []
    for msg in messages:
        result.append({
            "user": msg.user.username,
            "avatar_url": msg.user.avatar_url or "/static/avatars/default-avatar.png",
            "text": msg.text,
            "timestamp": msg.timestamp.isoformat()
        })

    return jsonify({"messages": result})




#pentru afisare mesaj cand un utilizator da join la o sesiune
@app.route("/api/sessions/<code>/join", methods=["POST"])
@login_required
def join_session(code):
    cleanup_expired_sessions()
    session_obj = Session.query.filter_by(code=code).first()
    if not session_obj:
        return jsonify({'error':"Session does not exist or expired"}), 404
    

    user_id = session.get("user_id")
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error" : "User not found"}), 404
    
    join_text = f"{user.username} joined this session."
    join_msg = SessionMessage(session_code=code, user_id=user_id, text=join_text)
    db.session.add(join_msg)
    db.session.commit()

    socketio.emit('new-chat-message', {
        'user': 'System',
        'avatar_url': '/static/avatars/default-avatar.png', 
        'text': join_text,
        'timestamp': join_msg.timestamp.isoformat()
    }, room=code)

    return jsonify({"message" : "Join message posted"})


#functie de stergere a sesiunilor vechi din database
def cleanup_expired_sessions(hours=6):
    expiration_threshold = datetime.now(timezone.utc) - timedelta(hours=hours)
    expired_sessions = Session.query.filter(Session.created_at < expiration_threshold).all()
    for session_obj in expired_sessions:
        db.session.delete(session_obj)

    db.session.commit()


#endpoint pentru crearea unei sesiuni noi
@app.route('/api/sessions/create', methods=['POST'])
@login_required
def create_session():
    def generate_code(length=6):
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))
    
    cleanup_expired_sessions()

    while True:
        code= generate_code()
        exists = Session.query.filter_by(code=code).first()
        if not exists:
            break

    new_session = Session(code=code)
    db.session.add(new_session)
    db.session.commit()
    print(f"Session created: {code}")

    return jsonify({'code':code}), 201


#verificarea existentei unei sesiuni
@app.route('/api/sessions/<code>/exists', methods=['GET'])
def session_exists(code):
    cleanup_expired_sessions()
    code = code.upper()
    session_obj = Session.query.filter_by(code=code).first() 
    print(f"Checking existence for session code: {code} - Exists: {session_obj is not None}")
    exists = session_obj is not None
    return jsonify({'exists':exists}),200


connected_users = {}

@socketio.on('connect')
def on_connect():
    print(f"Client connected: {request.sid}")

@socketio.on('disconnect')
def on_disconnect():
    sid = request.sid
    #sterge userId care are acest sid

    for user, socket_id in list(connected_users.items()):
        if socket_id == sid:
            del connected_users[user]
            print(f"User {user} disconnected")
            break



#Partea de audio + video
@socketio.on('join-session')
def handle_join(data):
    session_code = data.get('sessionCode')
    user_id = data.get('userId')

    print(f"Socket join-session: user {user_id} joining {session_code}")
    if not session_code or not user_id:
        return
    
    connected_users[user_id] = request.sid
    
    join_room(session_code)
    #anuntam ceilalti useri ca un user nou a intrat
    emit('user-joined', {'userId': user_id}, room=session_code, include_self=False)

@socketio.on('leave-session')
def handle_leave(data):
    session_code = data.get('sessionCode')
    user_id = data.get('userId')
    if not session_code or not user_id:
        return

    user = User.query.get(user_id)
    if not user:
        return

    # Emit mesaj în chat că userul a părăsit sesiunea
    leave_text = f"{user.username} left this session."
    leave_msg = SessionMessage(session_code=session_code, user_id=user_id, text=leave_text)
    db.session.add(leave_msg)
    db.session.commit()

    socketio.emit('new-chat-message', {
        'user': 'System',
        'avatar_url': '/static/avatars/default-avatar.png',
        'text': leave_text,
        'timestamp': leave_msg.timestamp.isoformat()
    }, room=session_code)

    # Notifică restul participanților că userul a plecat
    emit('user-left', {'userId': user_id}, room=session_code)

    # Șterge utilizatorul din connected_users
    if user_id in connected_users:
        del connected_users[user_id]


@socketio.on('signal')
def handle_signal(data):
    session_code = data.get('sessionCode')
    target_id = data.get('targetId')
    signal_data = data.get('signal')
    from_user = data.get('userId')
    if not session_code or not target_id or not signal_data or not from_user:
        return
    
    target_sid = connected_users.get(target_id)
    #trimitere semnal doar catre target
    if target_sid:
        emit('signal', {'from':from_user, 'signal':signal_data}, room=target_sid)



#pentru refresh instant in pagina la toti utilizatorii cand cineva incarca un fisier
@socketio.on("file-uploaded")
def handle_file_uploaded(data):
    session_code = data.get("sessionCode")
    file_url = data.get("file_url")

    if not session_code or not file_url:
        return
    
    emit("new-file-uploaded",{"file_url":file_url}, room=session_code)



#partea de calendar
@app.route('/api/calendar/events', methods=['GET'])
@login_required
def get_events():
    user_id = session.get('user_id')
    events = CalendarEvent.query.filter_by(user_id = user_id).order_by(CalendarEvent.date).all()
    result = [{
        'id':e.id,
        'title':e.title,
        'description':e.description,
        'date':e.date.isoformat()
    }for e in events]
    return jsonify(result)


@app.route('/api/calendar/events', methods=['POST'])
@login_required
def add_event():
    user_id = session.get('user_id')
    data = request.get_json()
    title = data.get('title')
    description = data.get('description', '')
    date_str = data.get('date')

    if not title or not date_str:
        return jsonify({'error':'Missing title or date'}), 400
    
    try:
        event_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error':'Invalid date format, expected YYYY-MM-DD'}), 400
    
    new_event = CalendarEvent(user_id=user_id, title=title, description=description, date=event_date)
    db.session.add(new_event)
    db.session.commit()

    return jsonify({'message':'Event added successfully','event_id':new_event.id}), 201


#trimitere mail ca reminder pentru examene
def send_reminders():
    reminder_date = datetime.now(timezone.utc).date() + timedelta(days=3)
    events = CalendarEvent.query.filter(CalendarEvent.date == reminder_date).all()

    for event in events:
        user = User.query.get(event.user_id)
        if user and user.is_confirmed:
            try:
                msg = Message(
                    subject=f"Reminder: Upcoming event on {event.date}",
                    recipients=[user.email]
                )
                msg.body=(
                    f"Hello {user.username}, \n\n"
                    f"This is a reminder for your upcoming event: \n"
                    f"Title: {event.title}\n"
                    f"Date: {event.date}\n"
                    f"Details: {event.description or 'No aditional details'}\n\n"
                    "Good luck with your preparation!"
                )
                mail.send(msg)
                print(f"Sent reminder to {user.email} for event {event.title}")
            except Exception as e:
                print(f"Failed to send reminder email: {e}")



# Quote pentru pagina dashboard creat de AI
@app.route('/api/ai-quote', methods=['GET'])
def ai_quote():
    import random
    prompts = [
        "Invent a short, original, motivational quote for students who want to learn better. You can even repeat famous quotes, but personalize them. Make it positive and inspiring.",
        "Invent a unique, uplifting study tip as a short quote for a student.",
        "Write a creative motivational line for a learner to see on their dashboard."
    ]

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role":"user", "content": random.choice(prompts)}],
            max_tokens=40,
            temperature=0.85
        )
        quote= response.choices[0].message.content.strip()
        return jsonify({"quote":quote})
    except Exception as e:
        print("AI quote error: ", e)
        return jsonify({"quote":"Keep pushing forward, every small step counts!"})
    



#last activity al userului
@app.route('/api/last-activities', methods=['GET'])
@login_required
def last_activities():
    user_id = session.get("user_id")
    activities = (UserActivity.query
                  .filter_by(user_id=user_id)
                  .order_by(UserActivity.created_at.desc())
                  .limit(10)
                  .all()
                  )
    result = []

    for act in activities: 
        result.append({
            "type": act.activity_type,
            "details": act.details,
            "date": act.created_at.isoformat()
        })
    
    return jsonify({"activities": result})




#weekly recap
@app.route('/api/weekly-recap', methods=['GET'])
@login_required
def weekly_recap():
    user_id = session.get("user_id")
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)

    activities = (UserActivity.query
                  .filter(UserActivity.user_id == user_id)
                  .filter(UserActivity.created_at >= week_ago)
                  .order_by(UserActivity.created_at.desc())
                  .all()
                  )
    
    num_summaries = sum(1 for a in activities if a.activity_type == "upload")
    num_quizzes = sum(1 for a in activities if a.activity_type == "finish_quiz")

    quiz_scores = []
    for a in activities:
        if a.activity_type == "finish_quiz":
            #cautam scorul in textul details
            m = re.search(r"Scored\s(\d+)/(\d+)", a.details or "")
            if m:
                quiz_scores.append(int(m.group(1))/int(m.group(2)))

    avg_score = round(sum(quiz_scores) / len(quiz_scores) * 100, 1) if quiz_scores else None

    #calculam streak cate zile consecutive cu activitate
    dates = set(a.created_at.date() for a in activities)
    streak = 0
    for i in range(0,7):
        check_day = (now.date() - timedelta(days=i))
        if check_day in dates:
            streak += 1
        else:
            break


    #mesaj de motivatie
    if streak >= 3:
        motivational = f"🔥 Best streak: {streak} active days in a row! Keep going!"
    elif num_quizzes + num_summaries > 0:
        motivational = "Congrats! You're making progress this week! 💡"
    else:
        motivational = "Start your week with a new upload or quiz! Maybe ask Fallnik something, I'm sure he can help you with any answers, he's pretty smart 😉"

    return jsonify({
        "num_summaries": num_summaries,
        "num_quizzes": num_quizzes,
        "avg_score": avg_score,
        "streak": streak,
        "motivational": motivational
    })


# DataBase initialization (crearea automata a tabelului)
def create_tables():
    with app.app_context():
        db.create_all()


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "https://www.fallnik.com"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    return response

# Pornim serverul
if __name__ == "__main__":
    create_tables()
    socketio.run(app, debug=False, host="127.0.0.1", port=5000)