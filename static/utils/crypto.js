export function encryptMessage(message, key) {
    return CryptoJS.AES.encrypt(message, key).toString();
}


export function decryptMessage(encryptedMessage, key) {
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


export function encryptImage(imageFile, key) {
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


export function decryptImage(encryptedImage, key) {
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
