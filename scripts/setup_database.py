import os
import sys

# Suppress type hint warnings for dynamic typed imports
import mysql.connector # type: ignore

def setup_database():
    password = input("Enter MySQL root password (leave blank if none): ")
    try:
        # First connect without a database to create it
        print("Connecting to MySQL server...")
        conn = mysql.connector.connect( # type: ignore
            host="localhost",
            user="root",
            password=password
        )
        cursor = conn.cursor() # type: ignore
        
        script_path = os.path.join(os.path.dirname(__file__), '..', 'database', 'schema.sql')
        if not os.path.exists(script_path):
            script_path = os.path.join(os.path.dirname(__file__), '..', 'database', 'database_setup.sql')
        
        with open(script_path, 'r', encoding='utf-8') as file:
            sql_script = file.read()
            
        print(f"Executing {os.path.basename(script_path)}...")
        
        # Split statements, ignoring empty ones
        statements = [s.strip() for s in sql_script.split(';') if s.strip()]
        
        for statement in statements:
            if statement:
                # Use standard string formatting instead of slicing to avoid VSCode Pylance complaints
                preview = f"{statement:.50s}..." if len(statement) > 50 else statement
                print(f"Executing: {preview}")
                cursor.execute(statement) # type: ignore
                
        conn.commit() # type: ignore
        print("Database setup completed successfully!")
        
    except Exception as err:
        print(f"Error: {err}")
    finally:
        if 'conn' in locals() and conn.is_connected(): # type: ignore
            cursor.close() # type: ignore
            conn.close() # type: ignore

if __name__ == "__main__":
    setup_database()
