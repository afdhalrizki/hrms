import sys
import os
import shutil

def switch_env(env_name):
    """
    Switches the current root .env file to the specified environment template.
    Usage: python switch_env.py [local|qa|staging|production]
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    root_dir = os.path.dirname(base_dir)
    env_dir = base_dir
    
    # Map friendly names to actual file names
    map_env = {
        'local': '.env.local',
        'dev': '.env.local',
        'qa': '.env.qa',
        'staging': '.env.staging',
        'production': '.env.production',
        'prod': '.env.production'
    }
    
    file_name = map_env.get(env_name.lower())
    if not file_name:
        print(f"Error: Environment '{env_name}' not recognized.")
        print(f"Available: dev, qa, staging, prod")
        return

    source = os.path.join(env_dir, file_name)
    target = os.path.join(root_dir, ".env")
    
    if not os.path.exists(source):
        print(f"Error: Environment template '{source}' not found.")
        return

    try:
        shutil.copy2(source, target)
        print(f"🚀 Successfully switched to '{env_name}' environment.")
        print(f"📍 Root .env now reflects: {file_name}")
    except Exception as e:
        print(f"❌ Error copying file: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python switch_env.py [dev|qa|staging|prod]")
    else:
        switch_env(sys.argv[1])
