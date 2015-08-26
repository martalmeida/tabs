TAMU TABS project
=================

Web application to display ocean model output in a dynamic map view.

Files
-----

scripts
  Python scripts to work with NetCDF files and produce sample output.
  Scripts may require `octant`_ package to run.
  Not used by the application.

static
  HTML and javascript used in the frontend application.
  Includes Leaflet plotting code, controls, and configuration.
  Also contains cached JSON and NetCDF data for serving local files.

tabs
  Backend code.  Contains Python modules used to load data from
  THREDDS server or local NetCDF file, generate contours at each time
  step.

app.py
  Flask application that ties it all together.  Serves the static
  files, and does the mapping between URLs and python functions.


Installation
------------
We recommend using a virtualenv to install the application

    virtualenv tabs-env
    source tabs-env/bin/activate
    pip install -r requirements.txt

Running the application
-----------------------

To start the application locally, run the command

    python app.py

from this directory.  Open a browser to http://localhost:5000 to view
the application.  Note that the default configuration is debug mode
and should not be run on a public server.

.. _octant: https://github.com/hetland/octant
