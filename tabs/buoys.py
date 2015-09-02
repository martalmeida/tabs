import os
import urllib2
from flask import json
import numpy as np


BUOYS = list('BDFJKNRVW')

REMOTE_URL = 'http://tabs.gerg.tamu.edu/tglo/RTA/Data/tabs_{:s}_ven.qc.txt'
HERE = os.path.abspath(os.path.dirname(__file__))
DATA_DIR = os.path.join(os.path.dirname(HERE), 'tabs', 'static', 'data')
CACHE_FILE = os.path.join(DATA_DIR, 'buoys.json')


def retrieve_tabs_buoy_data(buoy):
    """ Get all velocity data for a given buoy.

    """
    response = urllib2.urlopen(REMOTE_URL.format(buoy))
    if response.code != 200:
        return {}
    result = {}
    for line in response.readlines()[22:]:
        data = line.split()
        u, v = float(data[2]) / 100, float(data[3]) / 100
        if np.isfinite(u) and np.isfinite(v):
            time_stamp = data[0] + 'T' + data[1]
            result[time_stamp] = [u, v]
    return result


def cache_buoy_data():
    output = {}
    for buoy in BUOYS:
        result = retrieve_tabs_buoy_data(buoy)
        for time_stamp, vec in result.iteritems():
            ts = output.setdefault(time_stamp, {})
            ts[buoy] = vec
    return output


def get_buoys(time_stamp, cached=False):
    """ Retrieve vector velocity data for known buoys at given time_stamp.
    """
    if not os.path.exists(CACHE_FILE):
        data = cache_buoy_data()
        json.dump(data, open(CACHE_FILE, 'w'))
    else:
        data = json.load(open(CACHE_FILE))
    return data.get(time_stamp, {})
