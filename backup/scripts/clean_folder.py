import os, shutil, glob

os.chdir(os.path.expanduser('~/Desktop/IOMASTAVKA_FILE_28'))

# Что нужно СОХРАНИТЬ (ничего из этого не удалим)
KEEP = {
    'app.js', 'server.js', 'styles.css', 'index.html',
    'package.json', 'package-lock.json', 'README.md',
    '.env', '.gitignore', 'deploy.sh',
    'agents.json', 'rates.json', 'free-ai.js'
}
KEEP_DIRS = {'data', 'node_modules', '.git', 'for_openai', 'backup'}

# Что удалить — все наши служебные скрипты
DELETE_PATTERNS = [
    'fix_*.py', 'cache*.py', 'check_*.py', 'remove_*.py',
    'restore*.py', 'show_context.py', 'disable_*.py',
    'clean_block.py', 'add_gemini.py', 'clean_folder.py',
    'fix.py', 'fix*.py', '*.bak', '*.old', '*.tmp'
]

print('=== Сканирую папку ===')
all_files = os.listdir('.')
print('Всего файлов и папок: ' + str(len(all_files)))
print()

# Собираем список на удаление
to_delete = []
for pattern in DELETE_PATTERNS:
    for f in glob.glob(pattern):
        if os.path.isfile(f) and f not in KEEP and f not in to_delete:
            to_delete.append(f)

# Дедупликация
to_delete = sorted(set(to_delete))

print('=== Планирую удалить ' + str(len(to_delete)) + ' файлов ===')
for f in to_delete:
    size = os.path.getsize(f)
    print('  - ' + f + ' (' + str(size) + ' bytes)')
print()

# Создаём backup на всякий случай
if not os.path.exists('backup'):
    os.makedirs('backup/scripts')
    for f in to_delete:
        try:
            shutil.copy2(f, 'backup/scripts/' + f)
        except Exception as e:
            pass
    print('OK: backup создан в ./backup/scripts/ (' + str(len(to_delete)) + ' файлов)')
print()

# Удаляем
deleted = 0
for f in to_delete:
    try:
        os.remove(f)
        deleted += 1
    except Exception as e:
        print('WARN: не удалил ' + f + ': ' + str(e))

print('OK: удалено ' + str(deleted) + ' файлов')
print()

# Что осталось
print('=== Остались в папке ===')
remaining = sorted(os.listdir('.'))
for f in remaining:
    if os.path.isdir(f):
        print('  [DIR] ' + f)
    else:
        size = os.path.getsize(f)
        print('  ' + f + ' (' + str(size) + ' bytes)')

print()
print('===== ГОТОВО =====')
