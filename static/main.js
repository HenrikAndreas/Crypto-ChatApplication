// TODO 
// Fix --> SignUp joining

const socket = io.connect("10.0.0.40:80");

let vueApp = new Vue({
    el: '#vueApp',
    data: {
        title: "Chat Application",
        username: '',
        password: '',
        showForm: false,
        signUpVar: false, //Logic-var for login or sign up site
        message: '',
        data: null,
        users: null,
        decryption: false,
        crypto_key: '',
        loggedIn: false,
        crypto_string: 'joe',
        crypto_enc_string: 'IEfjW8eJaeXjfio29nCrJUCBDB1AsEbM9mcpkXRM2zU==='
    },

    methods: {
        login: function() {
            if ((this.username != '' & this.password != '')) {
                // Encrypting password with SHA256
                var pswd = forge.md.sha256.create().update(this.password).digest().toHex();
                socket.emit('login', this.username, pswd);
            } else {
                console.log("Wrong password");
            }
        },
        signUp: function() {
            if (this.username != '' & this.password != '') {
                // Encrypting password with SHA256
                var pswd = forge.md.sha256.create().update(this.password).digest().toHex();
                socket.emit('signUp', this.username, pswd);

            } else {
                console.log('Username and password dont match');
            }
        },
        change_signup: function() {
            if (this.signUpVar == false) {
                this.signUpVar = true;
            } else {
                this.signUpVar = false;
            }
            this.password = '';
            this.username = '';
        },
        sendMessage: function() {
            var objDiv = document.getElementById("chatDiv");
            objDiv.scrollTop = objDiv.scrollHeight;
    
            var msg = (this.username + ": " + this.message);
            socket.emit('sendMessage', this.encrypt(msg));
            
            this.message = '';
        },
        decryptionTester: function() {
            if (this.crypto_string == this.decrypt(this.crypto_enc_string)) {
                this.users = this.decrypt_array(this.users);
                this.data = this.decrypt_array(this.data);
                vueApp.$forceUpdate();
                this.decryption = true;
            } else {
                console.log("Incorrect key!");
            }

        },
        decrypt_array: function(array) {
            for (var i = 0; i < array.length; i++) {
                array[i] = this.decrypt(array[i]);
            }
            return array;
        },
        decrypt: function(encrypted_message) {
            // console.log(encrypted_message);
            var base64ciphertextFromPython = encrypted_message;
            var ciphertext = CryptoJS.enc.Base64.parse(base64ciphertextFromPython);
        
            // split iv and ciphertext
            var iv = ciphertext.clone();
            iv.sigBytes = 16;
            iv.clamp();
            ciphertext.words.splice(0, 4); // delete 4 words = 16 bytes
            ciphertext.sigBytes -= 16;
        
            // TEST SENERE UTEN PADDING -- IDIOT --
            var key = CryptoJS.enc.Utf8.parse(this.crypto_key);
        
            // decryption
            var decrypted = CryptoJS.AES.decrypt({ciphertext: ciphertext}, key, {
              iv: iv,
              mode: CryptoJS.mode.CFB
            });
            
            return ( decrypted.toString(CryptoJS.enc.Utf8));

        },
        encrypt: function(message) {
            var key = CryptoJS.enc.Utf8.parse(this.crypto_key);
            var iv = CryptoJS.lib.WordArray.random(16);
            var aes = CryptoJS.AES.encrypt(message, key, {iv: iv, mode: CryptoJS.mode.CFB});
            var encrypted_message = CryptoJS.enc.Utf8.parse("");
            encrypted_message.concat(iv);
            encrypted_message.concat(aes.ciphertext);
            return (CryptoJS.enc.Base64.stringify(encrypted_message));

        }
    }
});



socket.on('messageHandler', function(msg){
    if (vueApp.loggedIn) {
        if (vueApp.decryption) {
            vueApp.data.push(vueApp.decrypt(msg));
        } else {
            vueApp.data.push(msg);
        }
    }
});

socket.on('connection', function(messages){
    vueApp.data = messages;
});


socket.on('username_distribution', function(users){
    if (vueApp.loggedIn) {
        if (vueApp.decryption) {
            vueApp.users = [];
            for (var i = 0; i<users.length; i++) {
                vueApp.users.push(vueApp.decrypt(users[i]));
                console.log(vueApp.users[i]);
            }
        } else {
            vueApp.users = users;
        }
    
        // Auto scroll down
        var objDiv = document.getElementById("chatDiv");
        objDiv.scrollTop = objDiv.scrollHeight;

    }
});

socket.on('remove_user', function(username) {
    if (vueApp.loggedIn) {
        username = vueApp.decrypt(username);
        for(var i = 0; i < vueApp.users.length; i++) {
            if (vueApp.users[i] == username) {
                vueApp.users.splice(i, 1);
            }
        }
    }
});

socket.on('signUp', function() {
    vueApp.showForm = true;
    vueApp.loggedIn = true;
    socket.emit('username_distribution', vueApp.username);
});

socket.on('login', function(status) {
    if (status == 'ok') {
        vueApp.showForm = true;
        vueApp.loggedIn = true;
        socket.emit('username_distribution', vueApp.username);
    }
});

window.onbeforeunload = function() {
    if(vueApp.username != "") {
        socket.emit('disconnect_user', vueApp.username);
    }
}

