import gspread
from google.oauth2.service_account import Credentials
import requests

# Configuración
SHEET_NAME = "Juegos Stream"
WORKSHEET_NAME = "Hoja 1"
CLIENT_ID = "bdw6xy1oyflnchn8yd07ln7o3fa1bg"
CLIENT_SECRET = "np4t49sa6oipa8kabqk2m87zyjox8j"
TOKEN_URL = "https://id.twitch.tv/oauth2/token"
IGDB_URL = "https://api.igdb.com/v4/games"

# Autenticación con Google Sheets
def authenticate_google_sheets():
    credentials = Credentials.from_service_account_file(
        "credentials.json",
        scopes=["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"],
    )
    client = gspread.authorize(credentials)
    return client.open(SHEET_NAME).worksheet(WORKSHEET_NAME)

# Autenticación con IGDB
def authenticate_igdb():
    response = requests.post(
        TOKEN_URL,
        data={
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "grant_type": "client_credentials",
        },
    )
    response.raise_for_status()
    return response.json()["access_token"]

# Obtener la URL de la carátula
def get_cover_url(game_name, access_token):
    headers = {
        "Client-ID": CLIENT_ID,
        "Authorization": f"Bearer {access_token}",
    }
    query = f'fields name,cover.url; search "{game_name}"; limit 1;'
    response = requests.post(IGDB_URL, headers=headers, data=query)
    response.raise_for_status()
    results = response.json()
    if results and "cover" in results[0]:
        cover_url = results[0]["cover"]["url"]
        return f"https:{cover_url}".replace("t_thumb", "t_1080p")
    return "Sin Carátula"

# Actualizar las carátulas en Google Sheet
def update_cover_urls(sheet, access_token):
    rows = sheet.get_all_values()  # Obtener todas las filas del sheet
    for i, row in enumerate(rows[1:], start=2):  # Saltar encabezado (1-based index)
        game_name = row[0].strip() if len(row) > 0 else ""  # Primera columna (nombre del juego)
        if not game_name or game_name.lower() == "nombre":  # Excluir filas vacías o con "Nombre"
            continue

        # Verificar si ya tiene carátula
        current_cover = row[-1].strip() if len(row) > 7 else ""  # Última columna (Carátula)
        if not current_cover or current_cover.lower() == "sin carátula":
            print(f"Buscando carátula para: {game_name}")
            cover_url = get_cover_url(game_name, access_token)
            sheet.update_cell(i, 8, cover_url)  # Actualizar la columna de carátula
            print(f"Actualizada: {game_name} -> {cover_url}")

# Ejecutar la actualización
if __name__ == "__main__":
    try:
        sheet = authenticate_google_sheets()
        access_token = authenticate_igdb()
        update_cover_urls(sheet, access_token)
        print("Actualización completada.")
    except Exception as e:
        print(f"Error durante la ejecución: {e}")
