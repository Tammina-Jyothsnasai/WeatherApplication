# WeatherApplication 🌦️

## About the Project

WeatherApplication is a web-based application developed using Python and Flask. It allows users to check weather information for different cities through a simple and user-friendly interface.

The project uses a modular Flask structure to organize routes and application logic, making the code easier to understand, maintain, and extend.

## Features

- Search for weather information by city.
- View current weather details.
- Check weather forecasts.
- Manage favorite cities.
- Use separate Flask route modules to organize API endpoints.
- Handle city-related operations using a city resolver module.
- Store application data using a database.
- Test application functionality using a test suite.

## Technologies Used

- **Programming Language:** Python
- **Backend Framework:** Flask
- **Database:** As configured in the project
- **Frontend:** HTML, CSS, and JavaScript, if included in the project
- **Development Tool:** Visual Studio Code
- **Version Control:** Git and GitHub

## Project Structure

```text
WeatherHub/
│
├── app.py
├── city_resolver.py
├── config.py
├── database.py
├── test_suite.py
├── .gitignore
├── README.md
│
├── routes/
│   ├── __init__.py
│   ├── current_weather.py
│   ├── forecast.py
│   ├── favorites_create.py
│   ├── favorites_read.py
│   ├── favorites_update.py
│   └── favorites_delete.py
│
├── static/
├── templates/
└── requirements.txt
```

*Note: This structure is based on the files identified in the project. Keep only the folders and files that actually exist in your repository.*

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Tammina-Jyothsnasai/WeatherApplication.git
```

### 2. Open the Project Folder

```bash
cd WeatherApplication/WeatherHub
```

Adjust the path if your cloned repository contains the application files directly in its root folder.

### 3. Create a Virtual Environment

```bash
python -m venv .venv
```

Activate it on Windows:

```cmd
.venv\Scripts\activate
```

### 4. Install Dependencies

If the project contains a `requirements.txt` file, run:

```bash
pip install -r requirements.txt
```

If it does not exist, install the dependencies listed in your project, including Flask and any other required packages.

### 5. Configure Environment Variables

If the application requires API keys, database settings, or other environment variables, configure them according to your `config.py` file.

Do not upload passwords, API keys, or other secrets to GitHub. Keep them in your local `.env` file and ensure `.env` is listed in `.gitignore`.

### 6. Run the Application

```bash
python app.py
```

Open the local URL displayed in your terminal, commonly:

```text
http://127.0.0.1:5000/
```

The exact URL and port depend on your application configuration.

## Testing

Run the project's test suite using the command appropriate for its implementation. If `test_suite.py` contains standard Python or pytest tests, you can try:

```bash
python test_suite.py
```

Check the terminal output to verify whether the tests pass.

## Learning Outcomes

Through this project, I practised:

- Developing a web application using Flask.
- Organizing application endpoints into separate route modules.
- Working with database operations.
- Managing application configuration.
- Testing application functionality.
- Using Git and GitHub for version control.

## Future Enhancements

- Improve error handling and input validation.
- Enhance the user interface and responsive design.
- Add more weather-related features.
- Improve automated test coverage.
- Add deployment support.

## Author

**Jyothsna Sai**

GitHub: [Tammina-Jyothsnasai](https://github.com/Tammina-Jyothsnasai)

---

*This project was developed for learning and practising Python Flask application development.*
