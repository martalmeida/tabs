from __future__ import print_function

import os
import requests

HERE = os.path.abspath(os.path.dirname(__file__))
DATA_DIR = os.path.join(os.path.dirname(HERE), 'tabs', 'static', 'data')

buoys = {
  'B': {'lat': 28.9823, 'lon': -94.89906},
  'D': {'lat': 27.9396, 'lon': -96.8429 },
  'F': {'lat': 28.8425, 'lon': -94.2416 },
  'J': {'lat': 26.1914, 'lon': -97.0507 },
  'K': {'lat': 26.2168, 'lon': -96.4998 },
  'N': {'lat': 27.8903, 'lon': -94.0367 },
  'R': {'lat': 29.635 , 'lon': -93.6417 },
  'V': {'lat': 27.8966, 'lon': -93.5973 },
  'W': {'lat': 28.3507, 'lon': -96.0058 }
}

baseurl = 'http://tabs.gerg.tamu.edu/tglo/RTA/Data/tabs_{0}_ven.qc.txt'

for buoy in buoys.keys():
    url = baseurl.format(buoy)
    _, filename = os.path.split(url)
    r = requests.get(url)
    print('Writing file', filename)
    with open(os.path.join(DATA_DIR, filename), 'w') as f:
        f.write(r.content)
