from threading import Timer, RLock

import numpy as np

from tabs.thredds_frame_source import THREDDSFrameSource


def fget(self):
    with self._fs_lock:
        if not self._fs:
            self.app.logger.info("Opening new THREDDS connection")
            # Ensure that we get the same ordering of grid points
            np.random.set_state(self.random_state)
            cls = THREDDSFrameSource
            self._fs = cls(**self._fs_args)
        self._reset_timer()
        return self._fs


def fset(self, value):
    with self._fs_lock:
        self._fs = value
        self._reset_timer()
        return self._fs


def fdel(self):
    with self._fs_lock:
        self._forget()


class ThreddsConnection(object):

    def __init__(self, app, random_state, timeout=300.0, **fs_args):
        """ Create an expiring connection to the THREDDS server.

        The connection will drop after 5 minutes of non-use. Any subsequent
        attempt to use the connection will initiate a new one. Access to the
        connection is RLock'd to ensure only one connection is alive at a time.

        Parameters:
        timeout : int, seconds
            The length of time in seconds to hold open a connection.

        Remaining keyword args are passed to the connection's constructor.
        """
        self.app = app
        self.random_state = random_state
        self._fs = None
        self._fs_lock = RLock()
        self._fs_args = fs_args
        self._timer = None
        self.timeout = float(timeout)

    def _forget(self):
        self.app.logger.info("Closing THREDDS connection")
        if self._timer:
            self._timer.cancel()
            self._timer = None
        self._fs = None

    def _reset_timer(self):
        self.app.logger.info("Resetting THREDDS connection timer")
        if self._timer:
            self._timer.cancel()
        self._timer = Timer(self.timeout, self._forget)
        self._timer.start()

    fs = property(fset=fset, fget=fget, fdel=fdel)
