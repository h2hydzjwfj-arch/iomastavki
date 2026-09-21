lines = open('app.js', 'r', encoding='utf-8').read().split('\n')
print('=== Всего строк: ' + str(len(lines)) + ' ===')
print()
print('=== Контекст вокруг строки 842 (строки 830-850) ===')
for i in range(max(0, 829), min(len(lines), 850)):
    mark = ' <<<' if (i + 1) == 842 else ''
    content = lines[i]
    # Показываем скрытые символы
    print('{:3d}: {}'.format(i+1, content[:110]) + mark)
