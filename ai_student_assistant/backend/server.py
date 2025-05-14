from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import hashlib, secrets, os
import uuid
from flask_mail import Mail, Message

# Flask app initializaton
app = Flask(__name__)
CORS(app)               #Accepta cereri de pe alte domenii (adica frontend)

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

# Hashing
def hash_password(password, salt):
    return hashlib.sha256((salt+password).encode('utf-8')).hexdigest()
    #se combina parola cu salt-ul si se aplica SHA-256


# Configurare server SMTP (PENTRU MAIL, folosesc gmail)
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'micalex607@gmail.com'
app.config['MAIL_PASSWORD'] = 'uudt inhh krxz obza'
app.config['MAIL_DEFAULT_SENDER'] = 'Fallnik <micalex607@gmail.com>'

mail = Mail(app)

# Register
@app.route('/api/register', methods = ['POST'])
def register():
    data = request.get_json()
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

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
    confirm_url = f"http://localhost:3000/confirm/{confirmation_token}"

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
    
    #facem hash la parola introdusa cu salt-ul utilizatorului din DataBase
    hashed_input = hash_password(password, user.salt)

    #comparam hash-ul generat cu cel din baza de date
    if hashed_input != user.password_hash:
        return jsonify({'error' : 'Invalid credentials'}), 401
    
    return jsonify({'message' : 'Login successful'}), 200

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




# DataBase initialization (crearea automata a tabelului)
def create_tables():
    with app.app_context():
        db.create_all()

# Pornim serverul
if __name__ == "__main__":
    create_tables()
    app.run(debug=True)