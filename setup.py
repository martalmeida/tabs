#!/usr/bin/env python

try:
    from setuptools import setup
except ImportError:
    from distut2ils.core import setup

setup(name='tabs',
      version='1.0dev',
      description='TABS website',
      packages=['tabs'],
      package_dir={'tabs': 'tabs'},
      package_data={'tabs': ['static/tabs.html', 'static/js/*.js',
                             'static/css/*.css']},
      entry_points={
          'console_scripts': [
              'tabs_server = tabs.app:main'
          ]
      })
