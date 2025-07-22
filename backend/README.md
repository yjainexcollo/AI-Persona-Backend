# AI-Persona Backend

A secure, scalable, and enterprise-grade multi-tenant backend for the AI-Persona SaaS platform.  
Supports modular authentication (local, OAuth, SSO-ready), workspace/user isolation, and AI persona integration.

---

## 📁 Folder Structure

```
backend/
  docs/                # API documentation (Swagger/OpenAPI)
  prisma/              # Prisma schema and migrations
  src/                 # Application source code
    auth/              # Authentication logic (local, OAuth, SSO)
    config/            # App and third-party configuration (env, passport, etc.)
    controllers/       # Route controllers
    middlewares/       # Express middlewares (auth, error handling, etc.)
    routes/            # API route definitions
    services/          # Business logic
    utils/             # Utility functions
    validations/       # Input validation schemas
    app.js             # Express app setup
    index.js           # App entry point
  package.json         # Project dependencies and scripts
  Dockerfile           # Docker build instructions
  docker-compose.yml   # Multi-container orchestration
  .env.template        # Example environment variables
  README.md            # Project documentation
```

---

## 🚀 Getting Started

### 1. Clone the Repository

```sh
git clone https://github.com/your-org/AI-Persona.git
cd AI-Persona/backend
```

### 2. Install Dependencies

```sh
npm install
```

### 3. Configure Environment Variables

- Copy `.env.template` to `.env` and fill in the required values.
- For local development, use the `localhost` DATABASE_URL.
- For Docker, use the `db` hostname in DATABASE_URL.

```sh
cp .env.template .env
```

### 4. Run the Backend Locally

```sh
npm run dev
```

_This uses nodemon for hot-reloading (if configured)._

### 5. Run with Docker

```sh
docker-compose up --build
```

- The backend will be available at [http://localhost:3000](http://localhost:3000)
- PostgreSQL will be available at `localhost:5432` (user: `postgres`, password: `postgres`)

---

## 🛠️ Environment Variables

See `.env.template` for all required variables.  
Key variables include:

- `PORT`: Port for the backend server
- `DATABASE_URL`: PostgreSQL connection string (local or Docker)
- `JWT_SECRET`: Secret for JWT signing
- `SESSION_SECRET`: Secret for session encryption
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: For Google OAuth
- `OAUTH_CALLBACK_URL`: OAuth callback endpoint

---

## 🐳 Docker & Database

- The `docker-compose.yml` file sets up both the backend and a PostgreSQL database.
- Data is persisted in a Docker volume (`db_data`).
- The backend service uses the `.env` file for configuration.

---

## 🧩 Prisma ORM

- Prisma schema is located in `prisma/schema.prisma`.
- To apply migrations:
  ```sh
  npm run migrate
  ```
- To generate Prisma client:
  ```sh
  npm run generate
  ```

---

## 📚 API Documentation

- API docs are maintained in `docs/swagger.yaml`.
- You can view or edit the OpenAPI spec for up-to-date API documentation.

---

## 📦 Authentication & Configuration Modules

- `src/auth/`: Contains all authentication logic, including local, OAuth, and SSO strategies, token management, and related helpers.
- `src/config/`: Centralizes configuration loading (environment variables, passport strategies, third-party integrations, etc.) for maintainability and security.

---

## 🕸️ API Endpoints

- **GraphQL:** [http://localhost:3000/graphql](http://localhost:3000/graphql)
- **REST Health Check:** [http://localhost:3000/health](http://localhost:3000/health)

---

## 📜 Available NPM Scripts

- `npm start` — Start the server in production mode
- `npm run dev` — Start the server with nodemon for development
- `npm run migrate` — Run Prisma migrations
- `npm run generate` — Generate Prisma client
- `npm run lint` — Lint the codebase (add linter setup as needed)
- `npm test` — Run tests (add test setup as needed)

---

## 🤝 Contributing

1. Fork the repo and create your branch.
2. Commit your changes and open a pull request.
3. Ensure all tests pass and code is linted.

---

## 📄 License

This project is licensed under the MIT License.

---

## 💡 Best Practices

- Never commit your real `.env` file or secrets.
- Use strong, unique secrets for JWT and session management.
- Keep dependencies up to date.
- Write tests for all business logic and authentication flows.
- Document any architectural or security decisions in the `docs/` folder.
- Centralized, robust logging and error handling using Winston and Express middleware.

---

## 📞 Support

For questions or support, open an issue or contact the maintainers.
