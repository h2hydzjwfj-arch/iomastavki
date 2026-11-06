"""Тесты tnved_check.py на сохранённых страницах alta.ru (без выхода в интернет).

Запуск: python -m unittest tools/test_tnved_check.py
"""
import os
import sys
import unittest
from decimal import Decimal

sys.path.insert(0, os.path.dirname(__file__))
import tnved_check as T  # noqa: E402

FIX = os.path.join(os.path.dirname(__file__), 'tnved_fixtures')

CBR_XML = ('<?xml version="1.0" encoding="windows-1251"?><ValCurs Date="07.11.2026" name="Foreign Currency Market">'
           '<Valute ID="R01235"><NumCode>840</NumCode><CharCode>USD</CharCode><Nominal>1</Nominal><Name>Доллар США</Name>'
           '<Value>81,6699</Value></Valute><Valute ID="R01239"><NumCode>978</NumCode><CharCode>EUR</CharCode><Nominal>1</Nominal>'
           '<Name>Евро</Name><Value>91,6010</Value></Valute><Valute ID="R01375"><NumCode>156</NumCode><CharCode>CNY</CharCode>'
           '<Nominal>1</Nominal><Name>Юань</Name><Value>12,1816</Value></Valute></ValCurs>').encode('cp1251')


def page(code):
    with open(os.path.join(FIX, f'alta_{code}.html'), encoding='utf-8') as f:
        return f.read()


class FakeResponse:
    def __init__(self, status=200, text='', content=b''):
        self.status_code, self.text, self.content, self.encoding = status, text, content or text.encode(), 'utf-8'

    def raise_for_status(self):
        if self.status_code >= 400:
            raise T.requests.HTTPError(str(self.status_code))


class FakeSession:
    """Отдаёт сохранённые страницы вместо интернета; считает обращения к ЦБ."""
    def __init__(self, fail=None):
        self.cbr_calls, self.fail = 0, fail

    def get(self, url, timeout=None):
        if self.fail:
            raise T.requests.ConnectionError('offline')
        if 'cbr.ru' in url:
            self.cbr_calls += 1
            return FakeResponse(content=CBR_XML)
        code = url.rstrip('/').split('/')[-1]
        path = os.path.join(FIX, f'alta_{code}.html')
        if not os.path.exists(path):
            return FakeResponse(404, 'not found')
        return FakeResponse(200, page(code))


class TestInput(unittest.TestCase):
    def test_clean_code(self):
        self.assertEqual(T.clean_code('6201.40.000.0'), '6201400000')
        self.assertEqual(T.clean_code(' 6403 19 000 0 '), '6403190000')
        with self.assertRaises(T.BadInput):
            T.clean_code('64031900')

    def test_amount(self):
        self.assertEqual(T.parse_amount('1 250 000,50 ₽'), Decimal('1250000.50'))
        self.assertEqual(T.parse_amount('1.250.000'), Decimal('1250000'))
        self.assertEqual(T.parse_amount('500000 руб.'), Decimal('500000'))
        with self.assertRaises(T.BadInput):
            T.parse_amount('много')

    def test_money_format(self):
        self.assertEqual(T.fmt_money(1231), '1 231')
        self.assertEqual(T.fmt_money(Decimal('22000000')), '22 000 000')
        self.assertEqual(T.fmt_money(Decimal('91.601'), 2), '91.60')


class TestFee(unittest.TestCase):
    def test_scale_2026(self):
        cases = [(1, 1231), (200000, 1231), (200000.01, 2462), (450000, 2462), (500000, 4924), (1200000, 4924),
                 (2700000, 13541), (4200000, 18465), (5500000, 21344), (10000000, 49240), (10000000.01, 73860),
                 (50000000, 73860)]
        for value, fee in cases:
            self.assertEqual(T.customs_fee(value), fee, value)


class TestDuty(unittest.TestCase):
    def test_forms(self):
        d = T.parse_duty('15% ')
        self.assertEqual((d.mode, d.parts[0].kind, d.parts[0].value), ('single', 'ad_valorem', Decimal('15')))
        d = T.parse_duty('0.34 евр/пару ')
        self.assertEqual((d.parts[0].kind, d.parts[0].currency, d.parts[0].unit), ('specific', 'EUR', 'пару'))
        d = T.parse_duty('10% , но не менее 2.25 евро/кг')
        self.assertEqual(d.text, '10%, но не менее 2.25 евро/кг')
        self.assertEqual((d.mode, len(d.parts), d.parts[1].unit), ('min', 2, 'кг'))
        d = T.parse_duty('5% плюс 0,1 евро за 1 кг')
        self.assertEqual((d.mode, d.parts[1].value), ('plus', Decimal('0.1')))
        self.assertEqual(T.parse_duty('0').text, '0%')
        self.assertEqual(T.parse_duty('Беспошлинно').parts[0].value, Decimal('0'))

    def test_combined_takes_bigger(self):
        d = T.parse_duty('10%, но не менее 2.25 евро/кг')
        rates = {'EUR': Decimal('91.6010')}
        c = T.compute_duty(d, Decimal('500000'), Decimal('300'), None, rates)   # 50 000 vs 61 830.68
        self.assertEqual(T.fmt_money(c.amount), '61 831')
        self.assertIn('берётся большее', c.detail)
        c = T.compute_duty(d, Decimal('5000000'), Decimal('300'), None, rates)  # 500 000 vs 61 830
        self.assertEqual(T.fmt_money(c.amount), '500 000')

    def test_missing_quantity(self):
        c = T.compute_duty(T.parse_duty('0.34 евр/пару'), Decimal('100000'), None, None, {'EUR': Decimal('90')})
        self.assertIsNone(c.amount)
        self.assertIn('пар', c.missing)


class TestAltaPages(unittest.TestCase):
    def test_tree_and_rates(self):
        info = T.parse_alta_page(page('6403190000'), '6403190000')
        self.assertEqual([lv.code for lv in info.levels], ['64-67', '64', '6403', '6403 1', '6403 19 000 0'])
        self.assertEqual(info.levels[-1].text, 'прочая')
        self.assertEqual(info.duty.text, '0.34 евр/пару')
        self.assertEqual([v.rate for v in info.vat], [Decimal('22')])

    def test_vat_variants(self):
        info = T.parse_alta_page(page('0401101000'), '0401101000')
        self.assertEqual(sorted({v.rate for v in info.vat}), [Decimal('10'), Decimal('22')])
        head, extra = T._vat_lines(info.vat)
        self.assertEqual(head, '22% (базовая)')
        self.assertTrue(extra and extra[0].startswith('10% — для использования в пищевых'))

    def test_zero_duty_with_note(self):
        info = T.parse_alta_page(page('8471300000'), '8471300000')
        self.assertEqual(info.duty.text, '0%')
        self.assertIn('преференциальный', info.duty.note)

    def test_other_code_redirect(self):
        with self.assertRaises(T.CodeNotFound):
            T.parse_alta_page(page('6403190000'), '6403190001')


class TestEndToEnd(unittest.TestCase):
    def test_report_combined(self):
        s = FakeSession()
        res = T.check('6201 40 000 0', '500 000', weight_raw='300', session=s)
        text = T.format_report(res)
        self.assertEqual(s.cbr_calls, 1)
        lines = text.split('\n')
        self.assertEqual(lines[0], '📋 Код: 6201400000')
        self.assertTrue(lines[1].startswith('🔧 XI. Текстильные материалы'))
        self.assertIn('💰 Пошлина: 10%, но не менее 2.25 евро/кг ≈ 61 831 ₽', text)
        self.assertIn('(курс ЦБ на 07.11.2026)', text)
        self.assertIn('🧾 НДС: 22% (базовая)', text)
        self.assertIn('   10% — для мальчиков', text)
        self.assertTrue(text.endswith('⚡ Сбор: 4 924 ₽ (при стоимости груза 500 000 ₽)'))

    def test_report_specific_without_qty(self):
        s = FakeSession()
        text = T.format_report(T.check('6403190000', '150000', session=s))
        self.assertEqual(s.cbr_calls, 0)  # без количества курс не нужен
        self.assertIn('💰 Пошлина: 0.34 евр/пару', text)
        self.assertIn('Для расчёта суммы укажите количество пар', text)
        self.assertIn('⚡ Сбор: 1 231 ₽ (при стоимости груза 150 000 ₽)', text)

    def test_report_specific_with_qty(self):
        text = T.format_report(T.check('6403190000', '150000', qty_raw='200', session=FakeSession()))
        self.assertIn('≈ 6 229 ₽', text)  # 0.34 × 200 × 91.601
        self.assertIn('0.34 € × 200 пар × 91.60 ₽', text)

    def test_not_found(self):
        with self.assertRaises(T.CodeNotFound):
            T.check('0000000000', '1000', session=FakeSession())

    def test_offline(self):
        T.RETRY_PAUSE = 0
        with self.assertRaises(T.SourceUnavailable):
            T.check('6403190000', '1000', session=FakeSession(fail=True))

    def test_json(self):
        import json
        data = json.loads(T.to_json(T.check('8471300000', '900000', session=FakeSession())))
        self.assertEqual(data['fee'], 4924)
        self.assertIn('💰 Пошлина: 0%', data['report'])


if __name__ == '__main__':
    unittest.main()
