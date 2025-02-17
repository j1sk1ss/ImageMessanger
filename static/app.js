function encryptMessage(message, key) {
    return CryptoJS.AES.encrypt(message, key).toString();
}


function decryptMessage(encryptedMessage, key) {
    try {
        if (!encryptedMessage) {
            return "Нет сообщения для дешифровки";
        }

        const decryptedMessage = CryptoJS.AES.decrypt(encryptedMessage, key).toString(CryptoJS.enc.Utf8);
        if (decryptedMessage) {
            return decryptedMessage;
        } else {
            return "Ошибка дешифровки";
        }
    } catch (error) {
        console.error("Ошибка дешифровки:", error);
        return "Ошибка дешифровки";
    }
}


function encryptImage(imageFile, key) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(event) {
            let imageBase64 = event.target.result;
            imageBase64 = imageBase64.split(',')[1];
            const encryptedImage = CryptoJS.AES.encrypt(imageBase64, key).toString();
            resolve(encryptedImage);
        };
        reader.onerror = function(error) {
            reject("Ошибка при чтении файла изображения: " + error);
        };
        reader.readAsDataURL(imageFile);
    });
}


function decryptImage(encryptedImage, key) {
    try {
        const decryptedBytes = CryptoJS.AES.decrypt(encryptedImage, key);
        const decryptedBase64 = decryptedBytes.toString(CryptoJS.enc.Utf8);
        if (!decryptedBase64) throw new Error("Ошибка дешифровки: данные пустые.");
        const byteArray = Uint8Array.from(atob(decryptedBase64), c => c.charCodeAt(0));
        return new Blob([byteArray], { type: 'image/jpeg' });
    } catch (error) {
        console.error("Ошибка дешифровки:", error);
        return null;
    }
}


async function auth() {
    const loginScreen = document.getElementById("loginScreen");
    const messengerContainer = document.getElementById("messengerContainer");
    const passwordInput = document.getElementById("password");
    const password = passwordInput.value.trim();
    if (password === "") {
        alert("Введите пароль!");
        return;
    }

    try {
        const response = await fetch("/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Ошибка авторизации");
        }

        const username = data.username;
        const access_key = data.key;
        localStorage.setItem("username", username);
        localStorage.setItem("access_key", access_key);

        loginScreen.style.display = "none";
        messengerContainer.style.display = "flex";

        loadContacts();
    } catch (error) {
        alert(error.message);
    }
}


async function openChat(contact) {
    document.getElementById("chatTitle").textContent = contact;
    const chatMessages = document.getElementById("chatMessages");
    const chat = document.getElementById("chatSection");
    chat.style.display = "block";
    chatMessages.innerHTML = "";
    fetchMessages();
}


async function loadContacts() {
    const username = localStorage.getItem("username");
    const accessKey = localStorage.getItem("access_key");
    if (!username || !accessKey) {
        alert("Ошибка: отсутствуют данные авторизации.");
        return;
    }

    try {
        const response = await fetch("/contacts", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": accessKey,
                "X-Username": username
            }
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Ошибка загрузки контактов");
        }

        const contactsList = document.getElementById("contactsList");
        contactsList.innerHTML = "";

        data.contacts.forEach(contact => {
            const li = document.createElement("li");

            li.classList.add("contact");
            li.textContent = contact;
            li.onclick = () => openChat(contact);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Удалить';
            deleteButton.onclick = (e) => {
                e.stopPropagation();
                removeContact(contact);
            };

            li.appendChild(deleteButton);
            contactsList.appendChild(li);
        });

    } catch (error) {
        alert(error.message);
    }
}


async function addContact() {
    const contact = document.getElementById("newContactNickname").value;
    const username = localStorage.getItem("username");
    const accessKey = localStorage.getItem("access_key");

    if (!contact) {
        alert("Никнейм не может быть пустым.");
        return;
    }

    if (!username || !accessKey) {
        alert("Ошибка: отсутствуют данные авторизации.");
        return;
    }

    try {
        const response = await fetch("/contacts", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": accessKey,
                "X-Username": username
            },
            body: JSON.stringify({ contact })
        });

        if (!response.ok) {
            throw new Error(response.message || "Ошибка добавления контакта");
        }

        loadContacts();
        closeAddContactInterface();

    } catch (error) {
        alert(error.message);
    }
}


async function removeContact(contact) {
    const username = localStorage.getItem("username");
    const accessKey = localStorage.getItem("access_key");

    if (!contact) {
        alert("Ошибка: отсутствует никнейм контакта.");
        return;
    }

    if (!username || !accessKey) {
        alert("Ошибка: отсутствуют данные авторизации.");
        return;
    }

    try {
        const response = await fetch("/contacts", {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                "Authorization": accessKey,
                "X-Username": username
            },
            body: JSON.stringify({ contact })
        });

        if (!response.ok) {
            throw new Error(response.message || "Ошибка удаления контакта");
        }

        loadContacts();
    } catch (error) {
        alert(error.message);
    }
}


function formatTime(time) {
    const date = new Date(time);
    return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
}


async function fetchMessages() {
    const accessKey = localStorage.getItem("access_key");
    const encryptionKey = document.getElementById('encryptKeyInput').value;
    const sender = document.getElementById('chatTitle').textContent;
    const user = localStorage.getItem("username");
    fetch(`/messages?receiver=${user}&sender=${sender}`, {
        method: 'GET',
        headers: {
            "Authorization": accessKey
        }
    }).then(response => response.json())
      .then(data => {
          data.messages.forEach(message => {
                let imageFile = null;
                let msg = "";

                if (message.message) {
                    msg = decryptMessage(message.message, encryptionKey);
                }

                if (message.image) {
                    fetch(message.image)
                        .then(imageResponse => imageResponse.text())
                        .then(encryptedImage => {
                            const decryptedBlob = decryptImage(encryptedImage, encryptionKey);
                            if (decryptedBlob) {
                                imageFile = decryptedBlob;
                                displayMessage(message.from, msg, message.time, imageFile);
                            } else {
                                console.error("Ошибка при дешифровке изображения");
                            }
                        })
                        .catch(error => console.error("Ошибка при загрузке изображения:", error));
                } else {
                    displayMessage(message.from, msg, message.time, imageFile);
                }
          });
      });
}


function displayMessage(sender, encryptedMessage, time, imageData) {
    const messageId = `${sender}-${time}`;
    if (document.getElementById(messageId)) {
        return;
    }

    const encryptionKey = document.getElementById('encryptKeyInput').value; 
    const chatMessages = document.getElementById('chatMessages');
    const messageContainer = document.createElement('div');
    messageContainer.id = messageId;
    messageContainer.classList.add('message');

    const header = document.createElement('div');
    header.classList.add('message-header');
    header.innerHTML = `<strong>${sender}</strong> <span>${formatTime(time)}</span>`;
    messageContainer.appendChild(header);

    const messageText = document.createElement('div');
    messageText.classList.add('message-text');
    messageText.textContent = encryptedMessage;
    messageContainer.appendChild(messageText);

    if (imageData) {
        const messageImage = document.createElement('img');
        messageImage.src = URL.createObjectURL(imageData);
        messageImage.classList.add('message-image');
        messageContainer.appendChild(messageImage);
    }

    chatMessages.appendChild(messageContainer);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}


document.addEventListener('DOMContentLoaded', function() {
    setInterval(fetchMessages, 5000);

    function sendMessageToServer(encryptedMessage, sender, receiver, imageData) {
        const accessKey = localStorage.getItem("access_key");
        const formData = new FormData();
        formData.append('message', encryptedMessage);
        formData.append('sender', sender);
        formData.append('receiver', receiver);
        if (imageData) {
            formData.append('file', imageData);
        }
    
        const fileInput = document.getElementById('imageInput');
        const fileData = fileInput.files[0];

        fetch('/messages', {
            method: 'POST',
            body: formData,
            headers: {
                "Authorization": accessKey
            }
        }).then(response => response.json())
          .then(data => {
              displayMessage(sender, document.getElementById('messageInput').value, data.time, fileData);
          });
    }
    
    document.getElementById('sendMessageButton').addEventListener('click', async function() {
        const message = document.getElementById('messageInput').value;
        const sender = localStorage.getItem("username");
        const receiver = document.getElementById('chatTitle').textContent;
        const encryptionKey = document.getElementById('encryptKeyInput').value; 
        console.log(encryptionKey);
        const encryptedMessage = encryptMessage(message, encryptionKey);
        const fileInput = document.getElementById('imageInput');
        const fileData = fileInput.files[0];
    
        let encryptedImage = null;
        if (fileData) {
            encryptedImage = await encryptImage(fileData, encryptionKey);
            const imageBlob = new Blob([encryptedImage], { type: 'image/jpeg' });
            encryptedImage = new File([imageBlob], "encrypted_image.jpg");
        }
    
        sendMessageToServer(encryptedMessage, sender, receiver, encryptedImage);
    });

    document.getElementById("imageInput").addEventListener("change", function(event) {
        const file = event.target.files[0];
        
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const imagePreview = document.getElementById("imagePreview");
                imagePreview.src = e.target.result;
                imagePreview.style.display = "block";
            };
            reader.readAsDataURL(file);
            const fileName = file.name;
            document.getElementById("fileNameLabel").textContent = fileName;
        } else {
            document.getElementById("imagePreview").style.display = "none";
            document.getElementById("fileNameLabel").textContent = "Загрузить изображение";
        }
    });    
});
