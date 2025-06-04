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

#Incarcare variabile din .env
load_dotenv()

#Setare cheie OpenAI
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Flask app initializaton
app = Flask(__name__)
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



# Hashing
def hash_password(password, salt):
    return hashlib.sha256((salt+password).encode('utf-8')).hexdigest()
    #se combina parola cu salt-ul si se aplica SHA-256


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
    
    #LOGIN REUSIT - se seteaza cookie cu sesiunea
    response = make_response(jsonify({'message': 'Login successful'}))
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
    response = make_response(jsonify({'message':'Logged out'}))
    response.set_cookie('session_id', '' , expires = 0)
    return response
    

#Endpoint pagina ai
@app.route('/api/ask-ai', methods=['POST'])
def ask_ai():
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

        return jsonify({
            'summary' : summary,
            'chat_message': chat_message,
            'download_url' : download_url
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
    session['spotify_access_token'] = tokens['access_token']
    session['spotify_refresh_token'] = tokens['refresh_token']

    return redirect("https://www.fallnik.com/dashboard/music?spotify=connected")



#Spotify Logout
@app.route('/api/spotify/logout', methods=['POST'])
def spotify_logout():
    session.pop('spotify_access_token', None)
    session.pop('spotify_refresh_token', None)
    return jsonify({'success': True})


#Spotify Profile
@app.route('/api/spotify/profile', methods=['GET'])
def spotify_profile():
    access_token = session.get('spotify_access_token')

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
    access_token = session.get('spotify_access_token')

    if not access_token:
        return jsonify({'error' : 'User not authenticated to Spotify'}), 401
    
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
    access_token = session.get('spotify_access_token')
    if not access_token:
        return jsonify({'error' : 'User not authenticated to Spotify'}), 401
    
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
    access_token = session.get('spotify_access_token')

    if not access_token:
        return jsonify({'error' : 'User not authenticated'}), 401
    
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
    access_token = session.get('spotify_access_token')

    if not access_token:
        return jsonify({'error' : 'Not authenticated to Spotify'}), 401
    
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
    access_token = session.get('spotify_access_token')

    if not access_token:
        return jsonify({'error' : 'Not authenticated to Spotify'}), 401
    
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
    access_token = session.get('spotify_access_token')

    if not access_token:
        return jsonify({'error' : 'Not authenticated to Spotify'}), 401
    
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
    access_token = session.get('spotify_access_token')

    if not access_token:
        return jsonify({'error' : 'Not authenticated to Spotify'}), 401
    
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
    access_token = session.get('spotify_access_token')

    if not access_token:
        return jsonify({'error' : 'Not authenticated to Spotify'}), 401
    
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
    access_token = session.get('spotify_access_token')

    if not access_token:
        return jsonify({'error' : 'Not authenticated to Spotify'}), 401
    
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
    access_token = session.get('spotify_access_token')

    if not access_token:
        return jsonify({'error' : 'Not authenticated to Spotify'}), 401
    
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
    access_token = session.get('spotify_access_token')

    if not access_token:
        return jsonify({'error' : 'Not authenticated to Spotify'}), 401
    
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
    access_token = session.get('spotify_access_token')
    query = request.args.get("q")

    if not access_token:
        return jsonify({'error' : 'Not authenticated to Spotify'}), 401
    
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
    app.run(debug=False, host="127.0.0.1", port=5000)