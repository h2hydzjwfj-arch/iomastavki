#!/usr/bin/env python3
"""
tnved_check.py — проверка 10-значного кода ТН ВЭД ЕАЭС.

Что делает
----------
1. Очищает введённый код от точек, пробелов и прочих символов и проверяет, что в нём 10 цифр.
2. Открывает страницу кода в публичном справочнике Альта-Софт (https://www.alta.ru/tnved/code/<код>/)
   и достаёт оттуда:
     • дерево позиции ТН ВЭД (раздел → группа → товарная позиция → … → сам код);
     • базовую ставку импортной пошлины (адвалорную, специфическую или комбинированную);
     • ставку НДС для кода, включая льготные варианты с условиями (если справочник их указывает).
3. Считает сумму пошлины в рублях:
     • адвалорная «X%» — от таможенной стоимости;
     • специфическая «Y евро/кг», «Y евр/пару» и т. п. — по весу или количеству и курсу ЦБ РФ;
     • комбинированная «X%, но не менее Y евро/кг» — берётся большая из двух сумм,
       «X% плюс Y …» — сумма обеих частей.
4. Считает таможенный сбор за таможенные операции по шкале, действующей с 01.01.2026
   (ПП РФ № 1637 от 28.11.2024 в ред. ПП № 1638 от 23.10.2025).
5. Печатает результат в формате:

    📋 Код: 6201400000
    🔧 XI. Текстильные материалы и текстильные изделия (Группы 50-63)
       ↳ 62 — Предметы одежды и принадлежности к одежде, …
       ↳ 6201 40 000 0 — из химических нитей
    💰 Пошлина: 10%, но не менее 2.25 евро/кг ≈ 61 830 ₽
       10% от 500 000 ₽ = 50 000 ₽; 2.25 € × 300 кг × 91.60 ₽ = 61 830 ₽ — берётся большее (курс ЦБ на 07.11.2026)
    🧾 НДС: 22% (базовая)
       10% — для мальчиков (в см, включительно): …
    ⚡ Сбор: 4 924 ₽ (при стоимости груза 500 000 ₽)

Запуск
------
    pip install requests beautifulsoup4
    python tnved_check.py 6201400000 500000 --weight 300
    python tnved_check.py "6201.40.000.0" 1 250 000 --qty 120     # пробелы в сумме допустимы
    python tnved_check.py 6403190000 300000 --qty 200               # 200 пар обуви
    python tnved_check.py                                           # спросит код и стоимость
    python tnved_check.py 8471300000 900000 --json                  # машиночитаемый ответ

Коды выхода: 0 — успех; 2 — неверный ввод; 3 — код не найден; 4 — справочник или ЦБ недоступны;
5 — не удалось разобрать страницу справочника (вероятно, изменилась вёрстка).

Справочные данные носят информационный характер: точные ставки зависят от страны происхождения,
даты и условий поставки — окончательное решение за таможенным представителем.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import xml.etree.ElementTree as ET
from dataclasses import asdict, dataclass, field
from decimal import ROUND_HALF_UP, Decimal
from typing import Dict, List, Optional, Tuple

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:  # pragma: no cover — понятная подсказка вместо трассировки
    sys.stderr.write('Нужны библиотеки: pip install requests beautifulsoup4\n')
    raise

# ----------------------------------------------------------------------------- настройки

ALTA_URL = 'https://www.alta.ru/tnved/code/{code}/'
CBR_URL = 'https://www.cbr.ru/scripts/XML_daily.asp'
USER_AGENT = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
              '(KHTML, like Gecko) Chrome/126.0 Safari/537.36 iomastavka-tnved/1.0')
TIMEOUT = 20          # секунд на один запрос
RETRIES = 3           # попыток при сетевых сбоях и ответах 5xx/429
RETRY_PAUSE = 1.5     # пауза между попытками, растёт с каждой попыткой

# Шкала таможенных сборов при ввозе, с 01.01.2026: (верхняя граница стоимости включительно, сбор).
FEE_SCALE_2026: List[Tuple[int, int]] = [
    (200_000, 1_231),
    (450_000, 2_462),
    (1_200_000, 4_924),
    (2_700_000, 13_541),
    (4_200_000, 18_465),
    (5_500_000, 21_344),
    (10_000_000, 49_240),
]
FEE_ABOVE_2026 = 73_860
FEE_SOURCE = 'ПП РФ № 1637 от 28.11.2024 в ред. ПП № 1638 от 23.10.2025, с 01.01.2026'

BASE_VAT = Decimal('22')  # базовая ставка НДС с 2026 года (ст. 164 НК РФ)

# Единицы специфической части пошлины: как пишет справочник → как показываем.
UNITS = {
    'кг': 'кг', 'kg': 'кг',
    'т': 'т', 'тонну': 'т', 'тонна': 'т',
    'пару': 'пару', 'пара': 'пару', 'пар': 'пару', 'пары': 'пару',
    'шт': 'шт', 'штуку': 'шт', 'штука': 'шт',
    'л': 'л', 'литр': 'л',
    'см3': 'см³', 'см³': 'см³', 'куб.см': 'см³',
    'м2': 'м²', 'м²': 'м²', 'кв.м': 'м²',
    'л.с': 'л.с.', 'л.с.': 'л.с.',
}
CURRENCIES = {'евро': 'EUR', 'евр': 'EUR', 'eur': 'EUR', '€': 'EUR',
              'долл': 'USD', 'доллар': 'USD', 'долларов': 'USD', 'usd': 'USD', '$': 'USD',
              'руб': 'RUB', 'рублей': 'RUB', 'rub': 'RUB', '₽': 'RUB'}
CUR_SIGN = {'EUR': '€', 'USD': '$', 'RUB': '₽'}


# ----------------------------------------------------------------------------- ошибки

class TnvedError(Exception):
    """Ошибка, которую можно показать пользователю как есть."""
    exit_code = 1


class BadInput(TnvedError):
    exit_code = 2


class CodeNotFound(TnvedError):
    exit_code = 3


class SourceUnavailable(TnvedError):
    exit_code = 4


class PageFormatChanged(TnvedError):
    exit_code = 5


# ----------------------------------------------------------------------------- модели

@dataclass
class Level:
    """Один уровень дерева ТН ВЭД: «6403 1» — «спортивная обувь»."""
    code: str
    text: str


@dataclass
class VatRate:
    rate: Decimal
    condition: str = ''


@dataclass
class DutyPart:
    kind: str                      # 'ad_valorem' | 'specific'
    value: Decimal                 # проценты либо сумма за единицу
    currency: str = ''             # для специфической части: EUR / USD / RUB
    unit: str = ''                 # для специфической части: кг, пару, шт, л, …


@dataclass
class Duty:
    text: str                      # как в справочнике, слегка причёсано
    parts: List[DutyPart] = field(default_factory=list)
    mode: str = 'single'           # 'single' | 'min' (но не менее) | 'plus' (плюс)
    note: str = ''                 # пояснение справочника (преференции и т. п.)


@dataclass
class TnvedInfo:
    code: str
    url: str
    levels: List[Level]
    duty: Duty
    vat: List[VatRate]
    excise: str = ''
    source: str = 'alta'           # alta — живая страница; local — запасной справочник
    base_date: str = ''            # дата сборки запасного справочника (ГГГГ-ММ-ДД)


@dataclass
class DutyCalc:
    amount: Optional[Decimal]      # None — не хватает веса/количества
    detail: str
    missing: str = ''


@dataclass
class CheckResult:
    info: TnvedInfo
    customs_value: Decimal
    fee: int
    duty_calc: DutyCalc
    rates_date: str = ''


# ----------------------------------------------------------------------------- ввод и форматирование

def clean_code(raw: object) -> str:
    """Оставляет только цифры; требует ровно 10."""
    digits = re.sub(r'\D', '', str(raw or ''))
    if len(digits) != 10:
        raise BadInput(f'Код ТН ВЭД должен содержать 10 цифр, получено {len(digits)}: «{raw}»')
    return digits


def parse_amount(raw: object, what: str = 'Стоимость') -> Decimal:
    """«1 250 000,50» → Decimal('1250000.50'). Отрицательные и пустые значения не принимаются."""
    s = re.sub(r'(?i)руб(лей|ля|ль)?\.?|₽|rub', '', str(raw or ''))
    s = re.sub(r'[\s  ]', '', s).replace(',', '.')
    if s.count('.') > 1:  # «1.250.000» — точки как разделители тысяч
        s = s.replace('.', '')
    try:
        v = Decimal(s)
    except Exception:
        raise BadInput(f'{what}: не похоже на число — «{raw}»')
    if v < 0:
        raise BadInput(f'{what} не может быть отрицательной')
    return v


def fmt_code(code: str) -> str:
    """6403190000 → 6403 19 000 0 (как в номенклатуре)."""
    return f'{code[:4]} {code[4:6]} {code[6:9]} {code[9:]}'


def fmt_money(v: Decimal | int | float, digits: int = 0) -> str:
    """Разделитель тысяч — пробел: 1231 → «1 231», 91.6 (digits=2) → «91.60»."""
    q = Decimal(1) if digits == 0 else Decimal(1).scaleb(-digits)
    d = Decimal(str(v)).quantize(q, rounding=ROUND_HALF_UP)
    sign = '-' if d < 0 else ''
    whole, _, frac = f'{abs(d):f}'.partition('.')
    whole = f'{int(whole):,}'.replace(',', ' ')
    return sign + whole + (('.' + frac) if digits else '')


def fmt_num(v: Decimal) -> str:
    """Число без лишних нулей: Decimal('2.250') → «2.25», Decimal('10') → «10»."""
    s = f'{v.normalize():f}'
    return s


def customs_fee(value: Decimal | int | float) -> int:
    """Таможенный сбор за операции при ввозе по шкале 2026 года."""
    v = Decimal(str(value))
    for limit, fee in FEE_SCALE_2026:
        if v <= limit:
            return fee
    return FEE_ABOVE_2026


# ----------------------------------------------------------------------------- пошлина

_NUM = r'(\d+(?:\.\d+)?)'


def parse_duty(text: str, note: str = '') -> Duty:
    """Разбирает строку ставки пошлины из справочника.

    Поддерживаемые формы: «15%», «0», «Беспошлинно», «0.34 евр/пару», «2 евро за 1 кг»,
    «10%, но не менее 2.25 евро/кг», «5% плюс 0.1 евро/кг».
    """
    shown = re.sub(r'\s+', ' ', text).strip()
    shown = re.sub(r'\s+,', ',', shown)
    t = shown.lower().replace('ё', 'е')
    t = re.sub(r'(\d),(\d)', r'\1.\2', t)          # десятичная запятая → точка
    duty = Duty(text=shown, note=re.sub(r'\s+', ' ', note).strip())

    if not t or 'беспошлин' in t or re.fullmatch(r'0+(\.0+)?\s*%?', t):
        duty.parts = [DutyPart('ad_valorem', Decimal('0'))]
        duty.text = shown or '0%'
        if duty.text in ('0', '0.0'):
            duty.text = '0%'
        return duty

    adv = re.search(_NUM + r'\s*%', t)
    spec = re.search(_NUM + r'\s*(евро|евр|eur|€|доллар\w*|долл\w*|usd|\$|руб\w*|rub|₽)\.?\s*'
                            r'(?:/|за)\s*(?:1\s*)?([а-яa-z²³0-9.]+)', t)
    if adv:
        duty.parts.append(DutyPart('ad_valorem', Decimal(adv.group(1))))
    if spec:
        cur_raw = spec.group(2)
        cur = next((v for k, v in CURRENCIES.items() if cur_raw.startswith(k)), 'EUR')
        unit_raw = spec.group(3).rstrip('.').replace('куб', 'куб.')
        unit = UNITS.get(unit_raw, UNITS.get(unit_raw.rstrip('.'), unit_raw))
        duty.parts.append(DutyPart('specific', Decimal(spec.group(1)), cur, unit))
    if not duty.parts:
        raise PageFormatChanged(f'Не удалось понять ставку пошлины: «{shown}»')
    if len(duty.parts) == 2:
        duty.mode = 'plus' if ('плюс' in t or '+' in t) else 'min'
    return duty


def _quantity_for(unit: str, weight: Optional[Decimal], qty: Optional[Decimal]) -> Tuple[Optional[Decimal], str]:
    """Количество в единицах ставки и подпись, чего не хватает."""
    if unit == 'кг':
        return weight, 'вес груза в кг (--weight)'
    if unit == 'т':
        return (weight / 1000 if weight is not None else None), 'вес груза в кг (--weight)'
    names = {'пару': 'количество пар (--qty)', 'шт': 'количество штук (--qty)', 'л': 'объём в литрах (--qty)',
             'см³': 'объём двигателя в см³ (--qty)', 'м²': 'площадь в м² (--qty)', 'л.с.': 'мощность в л.с. (--qty)'}
    return qty, names.get(unit, f'количество в «{unit}» (--qty)')


def compute_duty(duty: Duty, value: Decimal, weight: Optional[Decimal], qty: Optional[Decimal],
                 rates: Optional[Dict[str, Decimal]]) -> DutyCalc:
    """Сумма пошлины в рублях с расшифровкой. rates — курсы ЦБ {'EUR': …, 'USD': …}."""
    pieces: List[Tuple[Decimal, str]] = []
    for p in duty.parts:
        if p.kind == 'ad_valorem':
            amt = value * p.value / 100
            pieces.append((amt, f'{fmt_num(p.value)}% от {fmt_money(value)} ₽ = {fmt_money(amt)} ₽'))
            continue
        q, need = _quantity_for(p.unit, weight, qty)
        if q is None:
            return DutyCalc(None, '', missing=need)
        if p.currency == 'RUB':
            rate = Decimal(1)
        else:
            if not rates or p.currency not in rates:
                raise SourceUnavailable('Нет курса ЦБ РФ для пересчёта специфической пошлины')
            rate = rates[p.currency]
        amt = p.value * q * rate
        rate_txt = '' if p.currency == 'RUB' else f' × {fmt_money(rate, 2)} ₽'
        unit_n = {'пару': 'пар'}.get(p.unit, p.unit)
        pieces.append((amt, f'{fmt_num(p.value)} {CUR_SIGN[p.currency]} × {fmt_num(q)} {unit_n}{rate_txt} = {fmt_money(amt)} ₽'))

    if len(pieces) == 1:
        amt, why = pieces[0]
        detail = '' if duty.parts[0].kind == 'ad_valorem' else why
        return DutyCalc(amt, detail)
    if duty.mode == 'plus':
        amt = pieces[0][0] + pieces[1][0]
        return DutyCalc(amt, f'{pieces[0][1]} + {pieces[1][1]}')
    amt = max(pieces[0][0], pieces[1][0])
    return DutyCalc(amt, f'{pieces[0][1]}; {pieces[1][1]} — берётся большее')


# ----------------------------------------------------------------------------- справочник

def _text(node) -> str:
    return re.sub(r'\s+', ' ', node.get_text(' ', strip=True)).strip() if node else ''


def parse_alta_page(html: str, code: str, url: str = '') -> TnvedInfo:
    """Разбирает HTML страницы кода на alta.ru."""
    soup = BeautifulSoup(html, 'html.parser')
    body = soup.select_one('.pTnved_body') or soup

    shown = body.select_one('[data-original-code]')
    if shown and re.sub(r'\D', '', shown.get('data-original-code', '')) not in ('', code):
        raise CodeNotFound(f'Справочник открыл другой код ({shown.get("data-original-code")}) — '
                           f'кода {code} в номенклатуре, вероятно, нет')

    # дерево позиции: первый блок «Позиция ТН ВЭД»
    levels: List[Level] = []
    for fs in body.select('fieldset.pTnved_positionFieldset'):
        legend = _text(fs.find('legend'))
        if 'ТН ВЭД' not in legend:
            continue
        for li in fs.select('li.pTnved_item'):
            label = _text(li.find('b')).replace('...', '').replace('…', '').strip()
            divs = li.find_all('div', recursive=False)
            text = _text(divs[-1]) if divs else _text(li)
            if text:
                levels.append(Level(label, text))
        break

    # ставки при импорте
    duty_text, duty_note, excise = '', '', ''
    vat: List[VatRate] = []
    imp = next((fs for fs in body.select('fieldset.pTnved_customs')
                if _text(fs.find('legend', recursive=False)) == 'Импорт'), None)
    if imp:
        for row in imp.select('tr.pTnved_item'):
            cells = row.find_all('td', recursive=False)
            if len(cells) < 2:
                continue
            label, cell = _text(cells[0]), cells[1]
            if label.startswith('Базовая ставка'):
                b = cell.find('b')
                duty_text = _text(b) if b else _text(cell)
                duty_note = _text(cell).replace(duty_text, '', 1).strip()
            elif label == 'НДС':
                for item in (cell.find_all('div', recursive=False) or [cell]):
                    b = item.find('b')
                    if not b:
                        continue
                    m = re.search(_NUM.replace(r'\.', r'[.,]') + r'\s*%', _text(b))
                    if not m:
                        continue
                    cond = _text(item).replace(_text(b), '', 1).strip()
                    cond = re.sub(r'^[-–—\s]+', '', cond)
                    if cond.startswith('Для отдельных категорий'):
                        cond = ''
                    vat.append(VatRate(Decimal(m.group(1).replace(',', '.')), cond))
            elif label == 'Акциз':
                excise = _text(cell)

    if not levels and not duty_text:
        raise PageFormatChanged('На странице справочника не нашлось ни описания, ни ставок — '
                                'похоже, изменилась вёрстка alta.ru или сайт показал заглушку')
    return TnvedInfo(code=code, url=url or ALTA_URL.format(code=code), levels=levels,
                     duty=parse_duty(duty_text, duty_note), vat=vat, excise=excise)


def _get(session: requests.Session, url: str, what: str) -> requests.Response:
    """GET с повторами при сетевых сбоях, 429 и 5xx."""
    last = ''
    for attempt in range(1, RETRIES + 1):
        try:
            r = session.get(url, timeout=TIMEOUT)
            if r.status_code == 404:
                return r
            if r.status_code in (429, 500, 502, 503, 504):
                last = f'HTTP {r.status_code}'
            else:
                r.raise_for_status()
                return r
        except requests.RequestException as e:
            last = e.__class__.__name__
        if attempt < RETRIES:
            time.sleep(RETRY_PAUSE * attempt)
    raise SourceUnavailable(f'{what} недоступен ({last}). Проверьте интернет и попробуйте позже.')


# Запасной справочник: reference/tnved-base.json рядом с сайтом (200–300 ходовых для Китая кодов с реальными
# ставками, собранными с alta.ru скриптом tools/build-tnved-base.js). Путь можно задать переменной TNVED_BASE.
BASE_FILE = os.environ.get('TNVED_BASE') or os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'reference', 'tnved-base.json')
_base_cache: Dict[str, object] = {}


def load_base(path: Optional[str] = None) -> Optional[dict]:
    path = path or BASE_FILE
    if path not in _base_cache:
        try:
            with open(path, encoding='utf-8') as f:
                b = json.load(f)
            _base_cache[path] = b if isinstance(b, dict) and 'codes' in b and 'nodes' in b else None
        except (OSError, ValueError):
            _base_cache[path] = None
    return _base_cache[path]  # type: ignore[return-value]


def base_info(code: str, path: Optional[str] = None) -> Optional[TnvedInfo]:
    """Запись запасного справочника в том же виде, что разбор страницы alta.ru."""
    b = load_base(path)
    e = b and b['codes'].get(code)
    if not e:
        return None
    levels = [Level(code=c, text=t) for c, t in (b['nodes'][i] for i in e.get('path', []))]
    vat = [VatRate(rate=Decimal(str(v[0])), condition=(v[1] if len(v) > 1 else '')) for v in e.get('vat', [])]
    return TnvedInfo(code=code, url=ALTA_URL.format(code=code), levels=levels, duty=parse_duty(e['duty'], e.get('note', '')),
                     vat=vat, excise=e.get('excise', ''), source='local', base_date=b.get('fetchedAt', ''))


def nearest_base(code: str, n: int = 3, path: Optional[str] = None) -> List[str]:
    b = load_base(path)
    if not b:
        return []
    for length in range(min(8, len(code) - 1), 3, -2):
        found = [c for c in b['codes'] if c.startswith(code[:length])]
        if found:
            return found[:n]
    return []


def fetch_tnved(code: str, session: Optional[requests.Session] = None) -> TnvedInfo:
    """Скачивает и разбирает страницу кода; alta.ru недоступен или сменил вёрстку — запасной справочник."""
    try:
        return _fetch_alta(code, session)
    except (SourceUnavailable, PageFormatChanged) as e:
        local = base_info(code)
        if local:
            return local
        near = nearest_base(code)
        if near:
            raise type(e)(f'{e} В запасном справочнике такого кода нет; похожие: {", ".join(near)}.') from e
        raise


def _fetch_alta(code: str, session: Optional[requests.Session] = None) -> TnvedInfo:
    s = session or new_session()
    url = ALTA_URL.format(code=code)
    r = _get(s, url, 'Справочник alta.ru')
    if r.status_code == 404:
        raise CodeNotFound(f'Код {code} не найден в справочнике ТН ВЭД ЕАЭС')
    # requests без charset в заголовке считает HTML латиницей — берём кодировку из <meta> или UTF-8
    ctype = (getattr(r, 'headers', None) or {}).get('content-type', '').lower()
    if 'charset=' not in ctype:
        m = re.search(rb'<meta[^>]+charset=["\']?([\w-]+)', (r.content or b'')[:4096], re.I)
        r.encoding = m.group(1).decode('ascii') if m else 'utf-8'
    return parse_alta_page(r.text, code, url)


def fetch_cbr_rates(session: Optional[requests.Session] = None) -> Tuple[Dict[str, Decimal], str]:
    """Курсы ЦБ РФ на сегодня: ({'EUR': Decimal, 'USD': Decimal, …}, 'дд.мм.гггг')."""
    s = session or new_session()
    r = _get(s, CBR_URL, 'Сайт ЦБ РФ')
    try:
        root = ET.fromstring(r.content)
    except ET.ParseError:
        raise SourceUnavailable('ЦБ РФ вернул неожиданный ответ вместо курсов валют')
    rates: Dict[str, Decimal] = {}
    for v in root.findall('Valute'):
        code = (v.findtext('CharCode') or '').strip()
        nominal = Decimal((v.findtext('Nominal') or '1').strip())
        value = Decimal((v.findtext('Value') or '0').strip().replace(',', '.'))
        if code and nominal:
            rates[code] = value / nominal
    return rates, root.get('Date', '')


def new_session() -> requests.Session:
    s = requests.Session()
    s.headers.update({'User-Agent': USER_AGENT, 'Accept-Language': 'ru-RU,ru;q=0.9',
                      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'})
    return s


# ----------------------------------------------------------------------------- проверка целиком

def check(code_raw: object, value_raw: object, weight_raw: object = None, qty_raw: object = None,
          session: Optional[requests.Session] = None) -> CheckResult:
    """Полная проверка: справочник + курс ЦБ (если нужен) + расчёт пошлины и сбора."""
    code = clean_code(code_raw)
    value = parse_amount(value_raw, 'Таможенная стоимость')
    weight = parse_amount(weight_raw, 'Вес') if weight_raw not in (None, '') else None
    qty = parse_amount(qty_raw, 'Количество') if qty_raw not in (None, '') else None
    s = session or new_session()
    info = fetch_tnved(code, s)

    rates, rates_date = None, ''
    needs_rate = any(p.kind == 'specific' and p.currency != 'RUB' for p in info.duty.parts)
    if needs_rate:
        q_ok = all(_quantity_for(p.unit, weight, qty)[0] is not None for p in info.duty.parts if p.kind == 'specific')
        if q_ok:
            rates, rates_date = fetch_cbr_rates(s)
    calc = compute_duty(info.duty, value, weight, qty, rates)
    return CheckResult(info, value, customs_fee(value), calc, rates_date)


def _vat_lines(vat: List[VatRate]) -> Tuple[str, List[str]]:
    """Первая строка НДС и строки с другими ставками и условиями."""
    if not vat:
        return f'{fmt_num(BASE_VAT)}% (базовая; справочник ставку не указал)', []
    rates = {v.rate for v in vat}
    base = BASE_VAT if BASE_VAT in rates else max(rates)
    if len(rates) == 1:
        label = 'базовая' if base == BASE_VAT else ('льготная' if base > 0 else 'не облагается')
        head = f'{fmt_num(base)}% ({label})'
        conds = [v.condition for v in vat if v.condition and v.rate != base]
        return head, conds
    head = f'{fmt_num(base)}% (базовая)'
    extra, seen = [], set()
    for v in vat:
        if v.rate == base:
            continue
        key = (v.rate, v.condition)
        if key in seen:
            continue
        seen.add(key)
        extra.append(f'{fmt_num(v.rate)}% — {v.condition}' if v.condition else f'{fmt_num(v.rate)}%')
    return head, extra


def format_report(res: CheckResult) -> str:
    """Текст ответа в формате ТЗ (разделитель тысяч — пробел)."""
    info, lines = res.info, []
    lines.append(f'📋 Код: {info.code}')
    if info.levels:
        first, rest = info.levels[0], info.levels[1:]
        lines.append(f'🔧 {first.text}')
        for lv in rest:
            lines.append(f'   ↳ {lv.code} — {lv.text}' if lv.code else f'   ↳ {lv.text}')
    else:
        lines.append(f'🔧 {fmt_code(info.code)} (описание в справочнике не найдено)')

    d, c = info.duty, res.duty_calc
    duty_line = f'💰 Пошлина: {d.text}'
    if c.amount is not None and (c.amount > 0 or d.parts[0].value > 0):
        duty_line += f' ≈ {fmt_money(c.amount)} ₽'
    lines.append(duty_line)
    if c.amount is None:
        lines.append(f'   Для расчёта суммы укажите {c.missing}')
    elif c.detail:
        lines.append(f'   {c.detail}' + (f' (курс ЦБ на {res.rates_date})' if res.rates_date else ''))

    head, extra = _vat_lines(info.vat)
    lines.append(f'🧾 НДС: {head}')
    lines.extend(f'   {x}' for x in extra)
    lines.append(f'⚡ Сбор: {fmt_money(res.fee)} ₽ (при стоимости груза {fmt_money(res.customs_value)} ₽)')
    if info.source == 'local':
        d8 = '.'.join(reversed(info.base_date.split('-'))) if re.match(r'^\d{4}-\d{2}-\d{2}$', info.base_date) else info.base_date
        lines.append(f'ℹ️ alta.ru недоступен — ставки из локального справочника на {d8}; перед декларированием сверьте с действующими.')
    return '\n'.join(lines)


def to_json(res: CheckResult) -> str:
    def conv(o):
        if isinstance(o, Decimal):
            return float(o)
        raise TypeError
    data = asdict(res)
    data['report'] = format_report(res)
    data['fee_source'] = FEE_SOURCE
    return json.dumps(data, ensure_ascii=False, indent=2, default=conv)


# ----------------------------------------------------------------------------- командная строка

def main(argv: Optional[List[str]] = None) -> int:
    ap = argparse.ArgumentParser(
        description='Проверка кода ТН ВЭД: описание, пошлина (с суммой в ₽), НДС и таможенный сбор 2026.')
    ap.add_argument('code', nargs='?', help='10-значный код ТН ВЭД (точки и пробелы допустимы)')
    ap.add_argument('value', nargs='*', help='таможенная стоимость груза, ₽ (можно с пробелами: 1 250 000)')
    ap.add_argument('--weight', '-w', help='вес груза, кг — для ставок «… евро/кг»')
    ap.add_argument('--qty', '-q', help='количество в единицах ставки: пары, штуки, литры, см³ …')
    ap.add_argument('--json', action='store_true', help='вывести результат в JSON')
    a = ap.parse_args(argv)

    try:
        code = a.code or input('Код ТН ВЭД: ')
        value = ' '.join(a.value) if a.value else input('Таможенная стоимость груза, ₽: ')
        res = check(code, value, a.weight, a.qty)
        out = to_json(res) if a.json else format_report(res)
        sys.stdout.write(out + '\n')
        return 0
    except TnvedError as e:
        sys.stderr.write(f'❌ {e}\n')
        return e.exit_code
    except (KeyboardInterrupt, EOFError):
        sys.stderr.write('\nОтменено\n')
        return 130


if __name__ == '__main__':
    sys.exit(main())
