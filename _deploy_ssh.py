import paramiko, sys

HOST = '192.168.88.241'
USER = 'yesilozilhami'
PASS = 'Rpz51gdL@28EV@KDwrYKD61!'

def p(t): sys.stdout.buffer.write((str(t)+'\n').encode('utf-8','replace')); sys.stdout.buffer.flush()

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=15)

def run(cmd, timeout=300):
    _, out, _ = ssh.exec_command(cmd, timeout=timeout)
    o = out.read().decode('utf-8','replace')
    p(o[-800:] if o else '(ok)')

run('cd ~/assethub && git pull', 60)
run('cd ~/assethub/backend && npm install 2>&1 | tail -3', 120)
run('cd ~/assethub/frontend && npm run build 2>&1 | tail -5', 300)
run('pm2 restart assethub-backend', 20)

# DB sync: payload + özkankurt kullanıcısı
p('--- DB senkronizasyonu basliyor ---')
run('cd ~/assethub/backend && node fill_payloads.js 2>&1 | tail -5', 60)
run('cd ~/assethub/backend && node create_ozkankurt.js 2>&1 | tail -3', 30)

ssh.close()
p('TAMAM')
