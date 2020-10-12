from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, send
from Crypto.Cipher import AES
from Crypto import Random
# from base64 import b64decode, b64encode
import base64
import os

#Cryptograhy --Start-- Credz to JoExBaYeR
crypto_key = 'henrikandreasbra'
BLOCK_SIZE = 16
def pad(data):
    length = 16 - (len(data) % 16)
    return data + chr(length)*length

def unpad(data):
    return data[:-ord(data[-1])]

def encrypt(message, passphrase):
    IV = Random.new().read(BLOCK_SIZE)
    aes = AES.new(passphrase.encode(), AES.MODE_CFB, IV, segment_size=128)
    return base64.b64encode(IV + aes.encrypt(pad(message).encode()))

def decrypt(encrypted, passphrase):
    encrypted = base64.b64decode(encrypted)
    
    IV = encrypted[:BLOCK_SIZE]
    aes = AES.new(passphrase.encode('utf-8'), AES.MODE_CFB, IV, segment_size=128)
    return (aes.decrypt(encrypted[BLOCK_SIZE:]))
#Cryptography --End--
app = Flask(__name__)
app.config["SECRET_KEY"] = os.urandom(64) # 64 random bytes
socketio = SocketIO(app)

# include request.sid
usersOnline = []

@app.route('/')
def home():
    return render_template("index.html")



def sendHistory():
    path = os.path.relpath('data\\log.dat', os.path.dirname(__file__))
    logFile = open(path, 'r')
    data = []
    for line in logFile:
        currentLine = line.lstrip().rstrip()
        currentLine = encrypt(currentLine, crypto_key).decode()
        data.append(currentLine)
    emit('connection', data)

@socketio.on('signUp')
def registrationHandler(username, password):
    path = os.path.relpath('data\\users.dat', os.path.dirname(__file__))
    userFile = open(path, 'a')
    userFile.write("{0:s} : {1}\n".format(username, password))
    userFile.close()
    emit('signUp')
    sendHistory()

@socketio.on('login')
def loginHandler(username, password):
    path = os.path.relpath('data\\users.dat', os.path.dirname(__file__))
    userFile = open(path, 'r')
    io_id = request.sid
    for l in userFile:
        line = l.split(':')
        line[0] = line[0].lstrip().rstrip()
        line[1] = line[1].lstrip().rstrip()
        if username.lower() == line[0].lower():
            if password == line[1]:
                emit('login', 'ok') #Weakest link?
                sendHistory()
    userFile.close()


@socketio.on('sendMessage')
def messageHandler(message): # From client
    message = decrypt(message, crypto_key)
    message = message.decode('unicode_escape')
    message = unpad(message)
    path = os.path.relpath('data\\log.dat', os.path.dirname(__file__))
    logFile = open(path, 'a')
    logFile.write("{0:s}\n".format(message))
    logFile.close()

    emit('messageHandler', encrypt(message, crypto_key).decode(), broadcast=True)

def messageFromServer(message):
    path = os.path.relpath('data\\log.dat', os.path.dirname(__file__))
    logFile = open(path, 'a')
    logFile.write("{0:s}\n".format(message))
    message = encrypt(message, crypto_key).decode()
    emit('messageHandler', message, broadcast=True)


@socketio.on('disconnect_user')
def disconnection(username):
    try:
        usersOnline.remove(username)
        user = encrypt(username, crypto_key).decode()
        emit('remove_user', user, broadcast=True)
        messageFromServer("{0:s} has disconnected!".format(username))
    except:
        print("[SERVER] Error on disconnect")


@socketio.on('username_distribution')
def username_distribution(username):    
    usersOnline.append(username)
    users = usersOnline[:]
    for i in range(len(users)):
        users[i] = encrypt(users[i], crypto_key).decode()

    emit('username_distribution', users, broadcast=True)
    messageFromServer("{0:s} has connected!".format(username))


if __name__ == "__main__":
    socketio.run(app, host="127.0.0.1", port=80, debug=True)