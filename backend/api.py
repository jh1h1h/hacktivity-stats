import requests
headers = {
  'Accept': 'application/json'
}

r = requests.get(
  'https://api.hackerone.com/v1/hackers/hacktivity?page[size]=100',
  headers = headers,
)

print(r.json())