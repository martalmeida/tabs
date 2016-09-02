import argparse
import sys
import numpy as np
from flask import Flask, jsonify, make_response, redirect, request, url_for
from flask.ext.compress import Compress

#from tabs.thredds_connection import ThreddsConnection, HINDCAST_CACHE_DATA_URI
from thredds_connection import ThreddsConnection, HINDCAST_CACHE_DATA_URI


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

# Retrieve bathy contours:

@app.route('/data/thredds/bathy')
def thredds_bathy():
    """ Return the bathy contours. """
    datasource = request.args.get('datasource', 'hindcast')
    fs = get_fs(datasource)
    bathy = fs.bathy
    return jsonify(bathy)


# Retrieve timestamps

@app.route('/data/thredds/timestamps')
def thredds_timestamps():
    """ Return the timestamps for the available frames. """
    datasource = request.args.get('datasource', 'hindcast')
    fs = get_fs(datasource)
    return jsonify({'timestamps': fs.epochSeconds.tolist()})


# Retrieve the radar grid
@app.route('/data/thredds/radar/grid')
def thredds_radar_grid():
    """ Return the grid points for the radar frames. """
    datasource = request.args.get('datasource', 'hindcast')
    fs = get_fs(datasource)
    return jsonify_dict_of_array(fs.radar_grid)


@app.route('/data/prefetched/radar/grid')
def static_radar_grid():
    """ Return the grid points for the radar frames. """
    filename = 'data/json/grd_locations.json'
    return redirect(url_for('static', filename=filename))

# radar frame:
@app.route('/data/thredds/radar/step/<int:time_step>')
def thredds_radar_frame(time_step):
    """ Return the radar frame close to date"""
    datasource = request.args.get('datasource', 'hindcast')
    app.logger.info(datasource)
    fs = get_fs(datasource)
    try:
        rs = fs.radar_frame(time_step)
        return jsonify_dict_of_array(rs)
    except Exception as e:
        msg = 'cannot extrat radar data (for time step %d).'%time_step
        app.logger.error(msg)
        app.logger.debug(str(e))
        return make_response(msg, 404)


@app.route('/data/prefetched/radar/step/<int:time_step>')
def static_radar_frame(time_step):
    """ Return the radar frame corresponding to `time_step`. """
    filename = 'data/json/step{}.json'.format(time_step)
    return redirect(url_for('static', filename=filename))


# Retrieve the wind grid
@app.route('/data/thredds/wind/grid')
def thredds_wind_grid():
    """ Return the grid points for the wind frames. """
    datasource = request.args.get('datasource', 'hindcast')
    fs = get_fs(datasource)
    return jsonify_dict_of_array(fs.wind_grid)

# wind frame:
@app.route('/data/thredds/wind/step/<int:time_step>')
def thredds_wind_frame(time_step):
    """ Return the wind frame close to date"""
    datasource = request.args.get('datasource', 'hindcast')
    app.logger.info(datasource)
    fs = get_fs(datasource)
	

    try:
        rs = fs.wind_frame(time_step)
        return jsonify_dict_of_array(rs)
    except Exception as e:
        msg = 'cannot extrat wind data (for time step %d).'%time_step
        app.logger.error(msg)
        app.logger.debug(str(e))
        return make_response(msg, 404)

# Retrieve the buoys grid
@app.route('/data/thredds/buoys/grid')
def thredds_buoys_grid():
    """ Return the grid points for the buoys frames. """
    datasource = request.args.get('datasource', 'hindcast')
    fs = get_fs(datasource)
    return jsonify_dict_of_array(fs.buoys_grid)

# buoys frame:
@app.route('/data/thredds/buoys/step/<int:time_step>')
def thredds_buoys_frame(time_step):
    """ Return the buoys frame close to date"""
    datasource = request.args.get('datasource', 'hindcast')
    app.logger.info(datasource)
    fs = get_fs(datasource)
    rs = fs.buoys_frame(time_step)
    return jsonify_dict_of_array(rs)
    try:
        rs = fs.buoys_frame(time_step)
        return jsonify_dict_of_array(rs)
    except Exception as e:
        msg = 'cannot extrat buoys data (for time step %d).'%time_step
        app.logger.error(msg)
        app.logger.debug(str(e))
        return make_response(msg, 404)

# Retrieve the velocity grid
@app.route('/data/thredds/velocity/grid')
def thredds_velocity_grid():
    """ Return the grid points for the velocity frames. """
    datasource = request.args.get('datasource', 'hindcast')
    fs = get_fs(datasource)
    return jsonify_dict_of_array(fs.velocity_grid)


@app.route('/data/prefetched/velocity/grid')
def static_velocity_grid():
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


@app.route('/data/prefetched/velocity/step/<int:time_step>')
def static_velocity_frame(time_step):
    """ Return the velocity frame corresponding to `time_step`. """
    filename = 'data/json/step{}.json'.format(time_step)
    return redirect(url_for('static', filename=filename))


# Retrieve salinity/temperature/speed contours
@app.route('/data/thredds/model/step/<int:time_step>')
def thredds_model_frame(time_step):
    logspace = 'logspace' in request.args
    datasource = request.args.get('datasource', 'hindcast')
    varname = request.args.get('varname', 'salt')

    if varname=='temp': defNLev=9
    else: defNLev=10
    num_levels = request.args.get('numSaltLevels', defNLev)

    fs = get_fs(datasource)
    salt = fs.salt_frame(
        time_step, num_levels=num_levels, logspace=logspace, varname=varname)
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
