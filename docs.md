## Dokumentasi CeKulit API

## **Endpoint Summary**

| HTTP Method | Endpoint           | Description                         |
| ----------- | ------------------ | ----------------------------------- |
| `POST`      | `/register`        | Registrasi pengguna baru.           |
| `POST`      | `/login`           | Login pengguna dan mendapatkan JWT. |
| `POST`      | `/otp`             | Verifikasi akun menggunakan OTP.    |
| `POST`      | `/forget-password` | Memulai proses lupa password.       |
| `POST`      | `/reset-password`  | Reset password menggunakan OTP.     |
| `GET`       | `/profile`         | Mendapatkan informasi profil.       |
| `PUT`       | `/profile`         | Mengupdate informasi profil.        |

---

### **1. Registrasi**

**Endpoint:**  
`POST /register`

**Description:**  
Registrasi pengguna baru dan mengirimkan OTP ke email untuk verifikasi.

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "johndoe@example.com",
  "password": "securepassword123"
}
```

**Responses:**

- **201 Created**
  ```json
  { "message": "User registered successfully." }
  ```
- **400 Bad Request**
  ```json
  { "message": "Name, email and password are required." }
  ```
- **500 Internal Server Error**
  ```json
  { "message": "User exist." }
  ```

---

### **2. Login**

**Endpoint:**  
`POST /login`

**Description:**  
Login pengguna dan mendapatkan token JWT.

**Request Body:**

```json
{
  "email": "johndoe@example.com",
  "password": "securepassword123"
}
```

**Responses:**

- **200 OK**
  ```json
  { "token": "your-jwt-token" }
  ```
- **400 Bad Request**
  ```json
  { "message": "Email and password are required." }
  ```
- **404 Not Found**
  ```json
  { "message": "User not found." }
  ```
- **500 Internal Server Error**
  ```json
  { "message": "User is not verified yet." }
  ```

---

### **3. Verifikasi OTP**

**Endpoint:**  
`POST /otp`

**Description:**  
Verifikasi akun menggunakan OTP.

**Request Body:**

```json
{
  "email": "johndoe@example.com",
  "otp": "1234"
}
```

**Responses:**

- **200 OK**
  ```json
  { "message": "User succesfully verified." }
  ```
- **400 Bad Request**
  ```json
  { "message": "Email and otp are required." }
  ```
- **403 Forbidden**
  ```json
  { "message": "Invalid OTP." }
  ```

---

### **4. Lupa Password**

**Endpoint:**  
`POST /forget-password`

**Description:**  
Memulai proses lupa password dengan mengirimkan OTP ke email.

**Request Body:**

```json
{
  "email": "johndoe@example.com"
}
```

**Responses:**

- **200 OK**
  ```json
  { "message": "OTP sent to your email." }
  ```
- **404 Not Found**
  ```json
  { "message": "User not found." }
  ```

---

### **5. Reset Password**

**Endpoint:**  
`POST /reset-password`

**Description:**  
Reset password menggunakan OTP.

**Request Body:**

```json
{
  "email": "johndoe@example.com",
  "otp": "1234",
  "newPassword": "newsecurepassword123"
}
```

**Responses:**

- **200 OK**
  ```json
  { "message": "Password successfully reset." }
  ```
- **403 Forbidden**
  ```json
  { "message": "Invalid OTP." }
  ```

---

### **6. Get Profile**

**Endpoint:**  
`GET /profile`

**Description:**  
Mendapatkan informasi profil pengguna yang sudah login.

**Headers:**  
| Key | Value | Required |
|---------------|-------------------------|----------|
| Authorization | `Bearer <JWT_TOKEN>` | Yes |

**Responses:**

- **200 OK**
  ```json
  {
    "name": "John Doe",
    "email": "johndoe@example.com"
  }
  ```
- **401 Unauthorized**
  ```json
  { "message": "Access Denied" }
  ```

---

### **7. Update Profile**

**Endpoint:**  
`PUT /profile`

**Description:**  
Mengupdate informasi profil pengguna.

**Headers:**  
| Key | Value | Required |
|---------------|-------------------------|----------|
| Authorization | `Bearer <JWT_TOKEN>` | Yes |

**Request Body:**

```json
{
  "name": "Jane Doe",
  "email": "janedoe@example.com"
}
```

**Responses:**

- **200 OK**
  ```json
  { "message": "Profile updated successfully." }
  ```
- **400 Bad Request**
  ```json
  { "message": "Name or email is required." }
  ```

---

**Catatan:**  
Semua endpoint yang memerlukan autentikasi harus menyertakan token JWT di header `Authorization`.
