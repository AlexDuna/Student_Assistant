from server import app, send_reminders

with app.app_context():
    send_reminders()