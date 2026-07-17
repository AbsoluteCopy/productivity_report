import urllib.request, json
req = urllib.request.Request(
    'http://127.0.0.1:8000/api/login/', 
    data=b'{"email": "admin@test.com", "password": "admin123"}', 
    headers={'Content-Type': 'application/json'}
)
try:
    resp = urllib.request.urlopen(req)
    print(resp.read().decode())
except Exception as e:
    print('ERROR STATUS:', e.code)
    print('ERROR BODY:', e.read().decode())
