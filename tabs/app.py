import argparse
import sys

import numpy as np
from flask import Flask, jsonify, make_response, redirect, request, url_for
from flask.ext.compress import Compress

from tabs.buoys import get_buoys
from tabs.thredds_connection import ThreddsConnection


class ReverseProxied(object):
    """Wrap the application in this middleware and configure the
    front-end server to add these headers, to let you quietly bind
    this to a URL other than / and to an HTTP scheme that is
    different than what is used locally.

    From http://flask.pocoo.org/snippets/35/

    In nginx:
    location /myprefix {
        proxy_pass http://192.168.0.1:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Scheme $scheme;
        proxy_set_header X-Script-Name /myprefix;
        }

    :param app: the WSGI application
    """
    def __init__(self, app):
        self.app = app

    def __call__(self, environ, start_response):
        script_name = environ.get('HTTP_X_SCRIPT_NAME', '')
        if script_name:
            environ['SCRIPT_NAME'] = script_name
            path_info = environ['PATH_INFO']
            if path_info.startswith(script_name):
                environ['PATH_INFO'] = path_info[len(script_name):]

        scheme = environ.get('HTTP_X_SCHEME', '')
        if scheme:
            environ['wsgi.url_scheme'] = scheme
        return self.app(environ, start_response)


app = Flask(__name__)
app.wsgi_app = ReverseProxied(app.wsgi_app)
Compress(app)


DECIMATE_FACTOR = 10
RANDOM_STATE = np.random.get_state()


tc = ThreddsConnection(app, random_state=RANDOM_STATE,
                       decimate_factor=DECIMATE_FACTOR)


def jsonify_dict_of_array(obj):
    """Return a jsonified copy of obj with list and array values turned into
    lists that have been rounded to four decimals.
    """
    obj = obj.copy()
    for k in obj:
        if isinstance(obj[k], (np.ndarray, list)):
            obj[k] = np.asarray(obj[k]).round(4).tolist()
    return jsonify(obj)


def get_fs(datasource):
    """ Return the right frame source from the THREDDS connection. """
    if datasource == 'hindcast':
        return tc.hindcast_fs
    elif datasource == 'forecast':
        return tc.forecast_fs
    else:
        raise ValueError('Unknown data source {0}'.format(datasource))


@app.route('/')
def index():
    return redirect(url_for('static', filename='tabs.html'))


# An outline of the region interest

@app.route('/data/prefetched/domain')
def domain():
    """ Return the domain outline """
    filename = 'data/json/domain.json'
    return redirect(url_for('static', filename=filename))


# Retrieve timestamps

@app.route('/data/thredds/timestamps')
def thredds_timestamps():
    """ Return the timestamps for the available frames. """
    datasource = request.args.get('datasource', 'hindcast')
    fs = get_fs(datasource)
    return jsonify({'timestamps': fs.epochSeconds.tolist()})


# Retrieve the grid

@app.route('/data/thredds/velocity/grid')
def thredds_grid():
    """ Return the grid points for the velocity frames. """
    datasource = request.args.get('datasource', 'hindcast')
    fs = get_fs(datasource)
    return jsonify_dict_of_array(fs.velocity_grid)


@app.route('/data/prefetched/velocity/grid')
def static_grid():
    """ Return the grid points for the velocity frames. """
    filename = 'data/json/grd_locations.json'
    return redirect(url_for('static', filename=filename))


# Retrieve velocity frames

@app.route('/data/thredds/velocity/step/<int:time_step>')
def thredds_velocity_frame(time_step):
    """ Return the velocity frame corresponding to `time_step`. """
    datasource = request.args.get('datasource', 'hindcast')
    app.logger.info(datasource)
    fs = get_fs(datasource)
    try:
        vs = fs.velocity_frame(time_step)
        return jsonify_dict_of_array(vs)
    except Exception as e:
        msg = 'No velocity available for time step {0:d}.'.format(time_step)
        app.logger.error(msg)
        app.logger.debug(str(e))
        return make_response(msg, 404)


@app.route('/data/thredds/buoys')
def buoy_vectors():
    """ Return the buoy vectors for a given `timestamp`.

    `timestamp` is a required qury string in ISO 8601 format in UTC,
    e.g. "2015-08-30T00:00:00".

    Returns u (east), v (north) components of velocity in m/s
    in a JSON dictionary for available buoys.
    """
    time_stamp = request.args.get('timestamp', None)
    if time_stamp is None:
        return make_response('time_stamp query required', 500)
    app.logger.info('Getting buoy data for {}'.format(time_stamp))
    res = get_buoys(time_stamp)
    return jsonify(res)


@app.route('/data/prefetched/velocity/step/<int:time_step>')
def static_velocity_frame(time_step):
    """ Return the velocity frame corresponding to `time_step`. """
    filename = 'data/json/step{}.json'.format(time_step)
    return redirect(url_for('static', filename=filename))


# Retrieve salinity contours

@app.route('/data/thredds/salt/step/<int:time_step>')
def thredds_salt_frame(time_step):
    num_levels = request.args.get('numSaltLevels', 10)
    logspace = 'logspace' in request.args
    datasource = request.args.get('datasource', 'hindcast')
    fs = get_fs(datasource)
    salt = fs.salt_frame(
        time_step, num_levels=num_levels, logspace=logspace)
    return jsonify(salt)


def start(debug=True, host='127.0.0.1', port=5000):
    app.run(debug=debug, host=host, port=port)


def main(argv=sys.argv[1:]):
    parser = argparse.ArgumentParser()
    parser.add_argument('-p', '--port', type=int, default=5000,
                        help="Port to listen on")
    parser.add_argument('-a', '--all', dest='host', action='store_const',
                        default='127.0.0.1', const='0.0.0.0',
                        help="Listen on all interfaces")
    parser.add_argument('-d', '--decimate', type=int, action='store',
                        default=10, help="Decimation factor")
    parser.add_argument('-D', '--debug', action='store_true',
                        help="Debug mode")
    parser.add_argument('--cached', action='store_true',
                        help='Use cached data.')

    args = parser.parse_args(argv)
    if args.decimate:
        tc._fs_args['decimate_factor'] = args.decimate
    tc.cached = args.cached
    start(debug=args.debug, host=args.host, port=args.port)


if __name__ == '__main__':
    main()
