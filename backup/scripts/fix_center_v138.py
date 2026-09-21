import re

p = 'styles.css'
s = open(p, 'r', encoding='utf-8').read()
orig = len(s)

css_add = """

/* ========== v138: точное центрирование шарика ========== */

/* Стадия — учесть padding-top 62px у окна */
.assistant-shell.voice-active .voice-orb-stage{
  top: 62px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

/* На мобильных padding 56px */
@media(max-width: 650px){
  .assistant-shell.voice-active .voice-orb-stage{
    top: 56px !important;
  }
}
"""

s = s.rstrip() + '\n' + css_add
open(p, 'w', encoding='utf-8').write(s)
print('styles.css: было ' + str(orig) + ', стало ' + str(len(s)))

p2 = 'index.html'
s2 = open(p2, 'r', encoding='utf-8').read()
s2 = re.sub(r'(styles\.css\?v=\d{8}-v)\d+', r'\g<1>138', s2)
s2 = re.sub(r'(app\.js\?v=\d{8}-v)\d+', r'\g<1>138', s2)
open(p2, 'w', encoding='utf-8').write(s2)
print('OK: index.html -> v138')
print('===== ГОТОВО =====')
