import tkinter as tk
from tkinter import ttk, messagebox, simpledialog
import gspread
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
import requests

# Configuración
SHEET_NAME = "Juegos Stream"
WORKSHEET_NAME = "Hoja 1"
CLIENT_ID = "bdw6xy1oyflnchn8yd07ln7o3fa1bg"
CLIENT_SECRET = "np4t49sa6oipa8kabqk2m87zyjox8j"
TOKEN_URL = "https://id.twitch.tv/oauth2/token"
IGDB_URL = "https://api.igdb.com/v4/games"
IGDB_API_URL = "https://api.igdb.com/v4/games"
IGDB_IMAGE_BASE_URL = "https://images.igdb.com/igdb/image/upload"

def authenticate_google_sheets():
    credentials = Credentials.from_service_account_file(
        "credentials.json",
        scopes=["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"],
    )
    client = gspread.authorize(credentials)
    return client.open(SHEET_NAME).worksheet(WORKSHEET_NAME), credentials

sheet, credentials = authenticate_google_sheets()

def copy_row_style(spreadsheet_id, sheet_id, source_row, target_row, credentials):
    """
    Copia el estilo de una fila a otra en la hoja de Google Sheets.
    """
    service = build('sheets', 'v4', credentials=credentials)
    requests_body = [
        {
            "copyPaste": {
                "source": {
                    "sheetId": sheet_id,
                    "startRowIndex": source_row - 1,  # Fila fuente (0-based)
                    "endRowIndex": source_row         # Fila fuente final (exclusivo)
                },
                "destination": {
                    "sheetId": sheet_id,
                    "startRowIndex": target_row - 1,  # Fila destino (0-based)
                    "endRowIndex": target_row         # Fila destino final (exclusivo)
                },
                "pasteType": "PASTE_FORMAT"
            }
        }
    ]
    service.spreadsheets().batchUpdate(
        spreadsheetId=spreadsheet_id,
        body={"requests": requests_body}
    ).execute()


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

# Buscar la última fila para un estado específico
def find_last_row(sheet, state):
    """
    Encuentra la última fila que corresponde al estado dado (categoría) en el Google Sheet.
    """
    rows = sheet.get_all_values()  # Obtener todas las filas
    last_row = 0
    for i, row in enumerate(rows):
        if len(row) > 1 and row[1].strip().lower() == state.lower():  # Comparar estado
            last_row = i + 1  # Guardar índice de fila (1-based)
    return last_row + 1  # Insertar justo después


def get_cover_url(game_name, access_token):
    headers = {
        "Client-ID": CLIENT_ID,
        "Authorization": f"Bearer {access_token}",
    }
    data = f'fields name,cover.url; search "{game_name}"; limit 1;'
    response = requests.post(IGDB_URL, headers=headers, data=data)
    response.raise_for_status()
    results = response.json()
    if results and "cover" in results[0]:
        cover_url = results[0]["cover"]["url"]
        return f"https:{cover_url}".replace("t_thumb", "t_1080p")
    return "Sin Carátula"

sheet, credentials = authenticate_google_sheets()
access_token = authenticate_igdb()

# Obtener datos iniciales
def get_games_by_category():
    rows = sheet.get_all_values()
    games = {"Jugando": [], "Planeo Jugar": [], "Pasado": []}
    for row in rows[1:]:
        if row[1] in games:  # Categoría válida
            games[row[1]].append(row)
    return games

# Clase principal de la aplicación
class GameManagerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Gestor de Juegos")

        # Crear pestañas
        self.tab_control = ttk.Notebook(root)
        self.tabs = {}
        self.tables = {}

        for category in ["Jugando", "Planeo Jugar", "Pasado"]:
            tab = ttk.Frame(self.tab_control)
            self.tab_control.add(tab, text=category)
            self.tabs[category] = tab

            # Crear tabla
            table = ttk.Treeview(tab, columns=("Nombre", "Estado", "YouTube", "Twitch", "Nota", "Horas", "Fecha", "Carátula"), show="headings")
            table.pack(fill=tk.BOTH, expand=True)

            for col in ("Nombre", "Estado", "YouTube", "Twitch", "Nota", "Horas", "Fecha", "Carátula"):
                table.heading(col, text=col)
                table.column(col, width=100)

            self.tables[category] = table

        self.tab_control.pack(fill=tk.BOTH, expand=True)

        # Botones de acción
        button_frame = tk.Frame(root)
        button_frame.pack(fill=tk.X)

        tk.Button(button_frame, text="Añadir Juego", command=self.add_game).pack(side=tk.LEFT, padx=5, pady=5)
        tk.Button(button_frame, text="Modificar Juego", command=self.modify_game).pack(side=tk.LEFT, padx=5, pady=5)
        tk.Button(button_frame, text="Eliminar Juego", command=self.delete_game).pack(side=tk.LEFT, padx=5, pady=5)

        # Cargar datos iniciales
        self.load_data()

    def load_data(self):
        games = get_games_by_category()
        for category, table in self.tables.items():
            table.delete(*table.get_children())  # Limpiar tabla

            # Invertir datos solo para "Pasado"
            if category == "Pasado":
                games[category].reverse()

            for game in games[category]:
                table.insert("", tk.END, values=game)


    def add_game(self):
        self.edit_game(mode="add")

    def modify_game(self):
        category = self.tab_control.tab(self.tab_control.select(), "text")
        table = self.tables[category]
        selected_item = table.focus()
        if not selected_item:
            messagebox.showwarning("Modificar Juego", "Selecciona un juego para modificar.")
            return
        data = table.item(selected_item, "values")
        self.edit_game(mode="edit", data=data, category=category, item=selected_item)

    def delete_game(self):
        category = self.tab_control.tab(self.tab_control.select(), "text")
        table = self.tables[category]
        selected_item = table.focus()
        if not selected_item:
            messagebox.showwarning("Eliminar Juego", "Selecciona un juego para eliminar.")
            return
        data = table.item(selected_item, "values")
        confirm = messagebox.askyesno("Eliminar Juego", f"¿Estás seguro de que quieres eliminar '{data[0]}'?")
        if confirm:
            rows = sheet.get_all_values()
            for i, row in enumerate(rows):
                if row[:8] == list(data):  # Comparar todos los valores
                    sheet.delete_rows(i + 1)
                    break
            self.load_data()

    def edit_game(self, mode, data=None, category=None, item=None):
        popup = tk.Toplevel(self.root)
        popup.title("Añadir Juego" if mode == "add" else "Modificar Juego")
        fields = ["Nombre", "Estado", "YouTube", "Twitch", "Nota", "Horas", "Fecha"]
        entries = {}

        for i, field in enumerate(fields):
            tk.Label(popup, text=field).grid(row=i, column=0, padx=5, pady=5)

            # Estado como spinner
            if field == "Estado":
                combo = ttk.Combobox(popup, values=["Jugando", "Planeo Jugar", "Pasado"])
                combo.grid(row=i, column=1, padx=5, pady=5)
                if mode == "edit":
                    combo.set(data[i])  # Preseleccionar estado
                entries[field] = combo
            else:
                entry = tk.Entry(popup, width=50)
                entry.grid(row=i, column=1, padx=5, pady=5)
                if mode == "edit":
                    entry.insert(0, data[i])  # Prellenar los valores en modo editar
                entries[field] = entry

        # Campo extra para la carátula (solo en modo editar)
        if mode == "edit":
            tk.Label(popup, text="Carátula").grid(row=len(fields), column=0, padx=5, pady=5)
            entry_caratula = tk.Entry(popup, width=50)
            entry_caratula.grid(row=len(fields), column=1, padx=5, pady=5)
            entry_caratula.insert(0, data[7])  # Prellenar con la URL actual
        else:
            entry_caratula = None  # No se usa en modo añadir

        def save_game():
            # Obtener valores del formulario
            values = [entry.get() for entry in entries.values()]
            
            if mode == "add":
                # Generar carátula automáticamente
                caratula = get_cover_url(values[0], access_token)
                values.append(caratula)
                
                # Insertar nueva fila
                new_row_index = find_last_row(sheet, values[1])
                sheet.insert_row(values, new_row_index)
                # Copiar estilo de la fila superior
                copy_row_style(sheet.spreadsheet.id, sheet._properties["sheetId"], new_row_index - 1, new_row_index, credentials)

            elif mode == "edit":
                # Usar carátula modificada
                caratula = entry_caratula.get()
                values.append(caratula)

                # Eliminar fila anterior
                rows = sheet.get_all_values()
                for i, row in enumerate(rows):
                    if row[:8] == list(data):  # Comparar todos los valores
                        sheet.delete_rows(i + 1)
                        break

                # Insertar nueva fila
                new_row_index = find_last_row(sheet, values[1])
                sheet.insert_row(values, new_row_index)
                # Copiar estilo de la fila superior
                copy_row_style(sheet.spreadsheet.id, sheet._properties["sheetId"], new_row_index - 1, new_row_index, credentials)

            self.load_data()
            popup.destroy()

        tk.Button(popup, text="Guardar", command=save_game).grid(row=len(fields) + (1 if mode == "edit" else 0), column=0, columnspan=2, pady=10)




# Ejecutar la aplicación
if __name__ == "__main__":
    root = tk.Tk()
    app = GameManagerApp(root)
    root.mainloop()