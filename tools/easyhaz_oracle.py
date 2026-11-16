#!/usr/bin/env python3
"""EasyHaz LSO 2014 çalışma kitabını LibreOffice ile kara kutu referans olarak çalıştırır.

Makrolar ASLA çalıştırılmaz (MacroExecutionMode=0); yalnız çalışma kitabının kendi
hücre formülleri LibreOffice tarafından yeniden hesaplanır. Çalışma kitabı salt
okunur açılır; orijinal dosya değişmez.

Güvenlik: LibreOffice'i araç kendisi başlatır ve iş bitince (hata olsa da) kapatır.
Bağlantı TCP portu değil, rastgele adlı ve yalnız bu kullanıcının bağlanabildiği bir
borudur (/tmp/OSL_PIPE_<uid>_…, srwxrwxr-x); başka yerel kullanıcılar ve işlemler
LibreOffice'i uzaktan yönetemez. Geçici bir profil kullanılır; kalıcı profil değişmez.

Kullanım:
  python3 tools/easyhaz_oracle.py vakalar.json cikti.json "/yol/EasyHazLSO2014 (v1.07).xlsm"

vakalar.json: [{"wl": 532, "mode": "rp", "value": 0.4, "tau": 5e-9, "prf": 10,
                "t": 0.25, "d": 7, "div": 0.6, "BE_beam_e_e2": "(1/e2)",
                "BE_Intrabeam_Range": 10}, ...]   (ANSI birimleri: mm, mrad, m)
Not: EasyHaz NOHD değerlerini VBA ile yinelemeli hesapladığından burada okunmaz;
NOHD, "OD at Observer Range" sıfıra inene kadar mesafe taranarak bulunabilir.
"""
import json, os, secrets, shutil, subprocess, sys, tempfile, time
import uno
from com.sun.star.beans import PropertyValue

XLSM = sys.argv[3] if len(sys.argv) > 3 else 'eh.xlsm'


def pv(name, value):
    p = PropertyValue()
    p.Name, p.Value = name, value
    return p


def start_office():
    """Bu işe özel LibreOffice: rastgele adlı boru (TCP yok), geçici profil."""
    profile = tempfile.mkdtemp(prefix='lazer-easyhaz-')  # 0700
    pipe = 'lazer_easyhaz_' + secrets.token_hex(16)
    proc = subprocess.Popen(
        ['soffice', '--headless', '--invisible', '--norestore', '--nologo', '--nodefault',
         '-env:UserInstallation=' + uno.systemPathToFileUrl(profile),
         '--accept=pipe,name=%s;urp;' % pipe],
        stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return proc, profile, pipe


def connect(proc, pipe):
    local = uno.getComponentContext()
    resolver = local.ServiceManager.createInstanceWithContext(
        'com.sun.star.bridge.UnoUrlResolver', local)
    for _ in range(120):
        if proc.poll() is not None:
            raise RuntimeError('soffice başlatılamadı')
        try:
            return resolver.resolve('uno:pipe,name=%s;urp;StarOffice.ComponentContext' % pipe)
        except Exception:
            time.sleep(0.5)
    raise RuntimeError('soffice not reachable')


def stop_office(proc, profile, desktop):
    """Her durumda LibreOffice'i kapatır ve geçici profili siler."""
    if desktop is not None:
        try:
            desktop.terminate()
        except Exception:
            pass  # bağlantı kapanırken istisna normal
    try:
        proc.wait(timeout=15)
    except subprocess.TimeoutExpired:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()
    shutil.rmtree(profile, ignore_errors=True)


def open_workbook(desktop):
    url = uno.systemPathToFileUrl(os.path.abspath(XLSM))
    return desktop.loadComponentFromURL(url, '_blank', 0, (
        pv('Hidden', True), pv('MacroExecutionMode', 0), pv('ReadOnly', True)))


doc = names = ehlso = None  # main() içinde atanır


_cells = {}
def cell_of(name):
    c = _cells.get(name)
    if c is None:
        c = names.getByName(name).getReferredCells().getCellByPosition(0, 0)
        _cells[name] = c
    return c

_last = {}


def put(name, value):
    c = cell_of(name)
    if isinstance(value, str):
        c.setString(value)
    else:
        c.setValue(float(value))


_ocells = {}
def get(addr):
    c = _ocells.get(addr)
    if c is None:
        c = ehlso.getCellRangeByName(addr)
        _ocells[addr] = c
    t = c.Type.value
    if t == 'VALUE':
        return c.getValue()
    if t == 'FORMULA':
        if c.getError() != 0:
            return 'ERR'
        if c.FormulaResultType2 == 1:  # com.sun.star.sheet.FormulaResult.VALUE
            return c.getValue()
    return c.getString()


OUT = {
    'mpe_eye': 'D29', 'mpe_skin': 'D30', 'times_skin': 'D31',
    'dmaj_rng': 'H16', 'dmin_rng': 'H17', 'od_rng': 'H18', 'od_worst': 'H19',
    'nohd': 'H20', 'dr_mpe': 'L13', 'dr_nhz': 'L14', 'dr_od': 'L15',
    'dr_skin_nhz': 'L16', 'dr_skin_mpe': 'L17', 'dr_times_skin': 'L18',
    'CA': 'P7', 'CB': 'P8', 'CC': 'P9', 'CP': 'P10', 'Klambda': 'P11',
    'T1': 'P12', 'T2': 'P13', 'la_eye_mm': 'P16', 'la_skin_mm': 'P17',
    'irr_peak': 'P19', 'irr_avg': 'P20', 'trans_la': 'P21',
    'rule_used': 'D62', 'rule1': 'D63', 'rule2': 'D64', 'rule3': 'D65',
    'pulses': 'D66', 'lol_od': 'H30', 'lol_nohd': 'H31', 'fo_od': 'H35',
    'fo_nohd': 'H36', 'mpe_label': 'B29', 'skin_label': 'B30',
    'dr_mpe_label': 'J13',
}

DEFAULTS = {
    'BE_wave_units': 'nanometer', 'BE_beam_e_e2': '(1/e)',
    'BE_proflie': 'circular gaussian', 'BE_M2_maj': 1, 'BE_M2_min': 1,
    'BE_Intrabeam_Range': 0, 'BE_spectral_ref': 100, 'BE_veiw_angle': 0,
    'BE_DRV_dia': 'point', 'BE_view_range': 0.5, 'BE_DRV_ed': 'na',
    'BE_fl_lens': 0, 'BE_LoL_profile': 'circular gaussian',
    'BE_LoL_maj_dia': 0, 'BE_LoL_min_dia': 0, 'BE_LoL_Range': 0,
    'BE_fiber_type': 'none', 'BE_NA': 0, 'BE_FO_ObsR_Rng': 0,
    'BE_oav': 'No', 'BE_atm': 0, 'BE_grf': 'na', 'BE_Tgroup': 'na',
}


def run(case):
    put('Module_on', 2)
    vals = dict(DEFAULTS)
    vals.update({
        'BE_wave': case['wl'],
        'BE_mode': {'cw': 'Continuous Wave', 'sp': 'Single Pulse',
                    'rp': 'Repetitive Pulse'}[case['mode']],
        'BE_ap_pe_input': case.get('input', 'Average Power' if case['mode'] == 'cw' else 'Energy per Pulse'),
        'BE_ap_pe_value': case['value'],
        'BE_ed': case.get('t', 'na'),
        'BE_pd': case.get('tau', 'na'),
        'BE_prr': case.get('prf', 'na'),
        'BufferDiaMaj': case.get('d', 1), 'BufferDiaMin': case.get('d', 1),
        'BE_div_maj': case.get('div', 1), 'BE_div_min': case.get('div', 1),
    })
    for k in ('BE_Intrabeam_Range', 'BE_view_range', 'BE_DRV_ed', 'BE_beam_e_e2',
              'BE_spectral_ref', 'BE_veiw_angle', 'BE_fl_lens', 'BE_LoL_maj_dia',
              'BE_LoL_min_dia', 'BE_LoL_Range', 'BE_oav', 'BE_atm',
              'BE_fiber_type', 'BE_NA', 'BE_FO_ObsR_Rng', 'BE_M2_maj', 'BE_M2_min'):
        if k in case:
            vals[k] = case[k]
    for k, v in vals.items():
        if _last.get(k, object()) != v:
            put(k, v)
            _last[k] = v
    doc.calculate()
    return {k: get(a) for k, a in OUT.items()}


def main():
    global doc, names, ehlso
    with open(sys.argv[1]) as f:
        cases = json.load(f)
    proc, profile, pipe = start_office()
    desktop = None
    try:
        ctx = connect(proc, pipe)
        desktop = ctx.ServiceManager.createInstanceWithContext('com.sun.star.frame.Desktop', ctx)
        doc = open_workbook(desktop)
        names = doc.NamedRanges
        ehlso = doc.Sheets.getByName('EHLSO')
        res = []
        t0 = time.time()
        for i, c in enumerate(cases):
            if i % 200 == 0:
                print('progress', i, round(time.time() - t0, 1), flush=True)
            try:
                r = run(c)
            except Exception as e:  # keep going, record the failure
                r = {'error': str(e)}
            res.append({'case': c, 'eh': r})
        with open(sys.argv[2], 'w') as f:
            json.dump(res, f, indent=1)
        doc.close(True)
        print('ok', len(res))
    finally:
        stop_office(proc, profile, desktop)


if __name__ == '__main__':
    main()
