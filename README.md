# Angular + Node.js + Express + MongoDB Application

A full-stack application with Angular frontend, Node.js/Express backend, and MongoDB database, using Angular Material for the UI.

## Project Structure

```
angular-nodejs-app/
├── frontend/          # Angular application with Angular Material
├── backend/           # Node.js/Express API server
└── README.md          # This file
```

## Prerequisites

- Node.js (v18 or higher)
- npm (comes with Node.js)
- MongoDB (local installation or MongoDB Atlas account)

## Setup Instructions

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure MongoDB connection:
   - Create a `.env` file in the `backend` directory (copy from `.env.example` if available)
   - Update `MONGODB_URI` with your MongoDB connection string:
     ```
     MONGODB_URI=mongodb://localhost:27017/angular-nodejs-app
     ```
   - For MongoDB Atlas, use:
     ```
     MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/angular-nodejs-app
     ```

4. Start MongoDB (if running locally):
   - Windows: Make sure MongoDB service is running
   - macOS/Linux: `mongod` or `brew services start mongodb-community`

5. Start the backend server:
   ```bash
   npm start
   ```
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

   The backend will run on `http://localhost:3000`

### 2. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies (if not already installed):
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```
   Or:
   ```bash
   ng serve
   ```

   The frontend will run on `http://localhost:4200`

## API Endpoints

### Health Check
- `GET /api/health` - Check if server is running

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create a new user
- `PUT /api/users/:id` - Update a user
- `DELETE /api/users/:id` - Delete a user

## Features

- ✅ Angular Material UI components
- ✅ RESTful API with Express.js
- ✅ MongoDB integration with Mongoose
- ✅ CORS enabled for frontend-backend communication
- ✅ User CRUD operations
- ✅ Responsive design

## Technologies Used

### Frontend
- Angular 19+
- Angular Material
- TypeScript
- RxJS

### Backend
- Node.js
- Express.js
- MongoDB (Mongoose)
- CORS
- dotenv

## Development

### Running Both Servers

Open two terminal windows:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
ng serve
```

## Building for Production

### Frontend
```bash
cd frontend
ng build --configuration production
```

### Backend
The backend is already production-ready. Just ensure environment variables are set correctly.

## Troubleshooting

1. **MongoDB Connection Error**: Ensure MongoDB is running and the connection string in `.env` is correct.

2. **CORS Errors**: The backend has CORS enabled. If you still see errors, check the `cors` configuration in `server.js`.

3. **Port Already in Use**: Change the port in `backend/.env` or `frontend/angular.json` if ports 3000 or 4200 are already in use.

## License

ISC
