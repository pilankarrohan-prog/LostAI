# LostAI Backend - AI-Powered Matching Engine

A Python FastAPI server that handles image embedding generation and similarity computations for matching lost and found items.

## Prerequisites
- Python 3.10 or higher
- Pip package manager

## Installation & Setup

1. **Navigate to the backend folder**:
   ```bash
   cd backend
   ```

2. **Create a Python virtual environment**:
   ```bash
   python -m venv venv
   ```

3. **Activate the virtual environment**:
   - **Windows (PowerShell)**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **Windows (CMD)**:
     ```cmd
     .\venv\Scripts\activate.bat
     ```
   - **macOS / Linux**:
     ```bash
     source venv/bin/activate
     ```

4. **Install the dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
   *Note: If torch and torchvision installation takes too long or fails in your workspace environment, the server will automatically run in a fallback mock embedding mode, keeping all APIs fully operational.*

## Running the Server

Start the Uvicorn ASGI dev server:
```bash
uvicorn app.main:app --port 8000 --reload
```

- **API Root**: `http://localhost:8000/`
- **Interactive Swagger Documentation**: `http://localhost:8000/docs`

## REST API Endpoints

1. `POST /lost-item`: Form parameters (name, category, brand, color, description, date, location) + image file upload.
2. `POST /found-item`: Form parameters (name, category, brand, color, description, date, location) + image file upload.
3. `GET /matches/{item_id}`: Compares the item ID against candidate matches in the database and returns similarity percentages.
