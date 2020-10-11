"# Crypto-ChatApplication"

Functional Chatting Application with a login / sign up system. Each password is hashed with SHA256 before sent to the server and saved. At login, the hashed password will be sent and compared server side.

AES encryption included, all messages, usernames and passowords are encrypted before being sent. Only people with the decryption key can decrypt the messages, and send messages. The rest can just observe the encrypted text with no idea what's going on.
