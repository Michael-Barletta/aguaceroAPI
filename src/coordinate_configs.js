export const COORDINATE_CONFIGS = {
    'arome1': {
        'type': 'latlon',
        'proj_params': {
            'proj': 'longlat',
            'datum': 'WGS84'
        },
        'grid_params': {
            'nx': 2801,
            'ny': 1791,
            'dx_degrees': 0.01,
            'dy_degrees': 0.01,
            'lon_first': 348.0,
            'lat_first': 55.4,
            'lon_last': 16.0,
            'lat_last': 37.5
        }
    },
    'arome25': {
        'type': 'latlon',
        'proj_params': {
            'proj': 'longlat',
            'datum': 'WGS84'
        },
        'grid_params': {
            'nx': 1121,
            'ny': 717,
            'dx_degrees': 0.025,
            'dy_degrees': 0.025,
            'lon_first': 348.0,
            'lat_first': 55.4,
            'lon_last': 16.0,
            'lat_last': 37.5
        }
    },
    'arpegeeu': {
        'type': 'latlon',
        'proj_params': {
            'proj': 'longlat',
            'datum': 'WGS84'
        },
        'grid_params': {
            'nx': 741,
            'ny': 521,
            'dx_degrees': 0.1,
            'dy_degrees': 0.1,
            'lon_first': 328.0,
            'lat_first': 72.0,
            'lon_last': 42.0,
            'lat_last': 20.0
        }
    },
    'arw': {
        'type': 'lambert_conformal_conic',
        'proj_params': {
            'proj': 'lcc',
            'lat_1': 25.0,
            'lat_2': 25.0,
            'lat_0': 25.0,
            'lon_0': -95.0,
            'x_0': 0,
            'y_0': 0,
            'R': 6371229,
            'units': 'm'
        },
        'grid_params': {
            'nx': 1473,
            'ny': 1025,
            'dx': 5079.0,
            'dy': -5079.0,
            'x_origin': -4228646.497,
            'y_origin': 4370737.239
        }
    },
    'ecmwf': {
        'type': 'latlon',
        'proj_params': {
            'proj': 'longlat',
            'datum': 'WGS84'
        },
        'grid_params': {
            'nx': 1440,
            'ny': 721,
            'dx_degrees': 0.25,
            'dy_degrees': 0.25,
            'lon_first': 180.0,
            'lat_first': 90.0,
            'lon_last': 179.75,
            'lat_last': -90.0
        }
    },
    'gefs': {
        'type': 'latlon',
        'proj_params': {
            'proj': 'longlat',
            'datum': 'WGS84'
        },
        'grid_params': {
            'nx': 720,
            'ny': 361,
            'dx_degrees': 0.5,
            'dy_degrees': 0.5,
            'lon_first': 0.0,
            'lat_first': 90.0,
            'lon_last': 359.5,
            'lat_last': -90.0
        }
    },
    'gem': {
        'type': 'latlon',
        'proj_params': {
            'proj': 'longlat',
            'datum': 'WGS84'
        },
        'grid_params': {
            'nx': 2400,
            'ny': 1201,
            'dx_degrees': 0.15,
            'dy_degrees': 0.15,
            'lon_first': 180.0,
            'lat_first': -90.0,
            'lon_last': 179.85,
            'lat_last': 90.0
        }
    },
    'gfs': {
        'type': 'latlon',
        'proj_params': {
            'proj': 'longlat',
            'datum': 'WGS84'
        },
        'grid_params': {
            'nx': 1440,
            'ny': 721,
            'dx_degrees': 0.25,
            'dy_degrees': 0.25,
            'lon_first': 0.0,
            'lat_first': -90.0,
            'lon_last': 359.75,
            'lat_last': 90.0
        }
    },
    'hrdps': {
        'type': 'rotated_latlon',
        'proj_params': {
            'proj': 'ob_tran',
            'o_proj': 'longlat',
            'o_lat_p': 53.91148,
            'o_lon_p': 245.305142,
            'lon_0': 0,
            'datum': 'WGS84'
        },
        'grid_params': {
            'nx': 2540,
            'ny': 1290,
            'dx_degrees': 0.0225,
            'dy_degrees': -0.0225,
            'lon_first': -14.8324700,
            'lat_first': 16.7112510,
            'lon_last': 42.3175330,
            'lat_last': -12.3137510
        }
    },
    'hrrr': {
        'type': 'lambert_conformal_conic',
        'proj_params': {
            'proj': 'lcc',
            'lat_1': 38.5,
            'lat_2': 38.5,
            'lat_0': 38.5,
            'lon_0': -97.5,
            'x_0': 0,
            'y_0': 0,
            'R': 6371229,
            'units': 'm'
        },
        'grid_params': {
            'nx': 1799,
            'ny': 1059,
            'dx': 3000.0,
            'dy': -3000.0,
            'x_origin': -2699020.142521929927170,
            'y_origin': 1588193.847443335689604
        },
    },
    'icond2': {
        'type': 'latlon',
        'proj_params': {
            'proj': 'longlat',
            'datum': 'WGS84'
        },
        'grid_params': {
            'nx': 1215,
            'ny': 746,
            'dx_degrees': 0.02,
            'dy_degrees': 0.02,
            'lon_first': 356.06,
            'lat_first': 43.18,
            'lon_last': 20.34,
            'lat_last': 58.08
        }
    },
    'iconeu': {
        'type': 'latlon',
        'proj_params': {
            'proj': 'longlat',
            'datum': 'WGS84'
        },
        'grid_params': {
            'nx': 1377,
            'ny': 657,
            'dx_degrees': 0.0625,
            'dy_degrees': 0.0625,
            'lon_first': 336.5,
            'lat_first': 29.5,
            'lon_last': 62.5,
            'lat_last': 70.5
        }
    },
    'nam': {
        'type': 'lambert_conformal_conic',
        'proj_params': {
            'proj': 'lcc',
            'lat_1': 50.0,
            'lat_2': 50.0,
            'lat_0': 50.0,
            'lon_0': -107.0,
            'x_0': 0,
            'y_0': 0,
            'R': 6371229,
            'units': 'm'
        },
        'grid_params': {
            'nx': 349,
            'ny': 277,
            'dx': 32463.0,
            'dy': -32463.0,
            'x_origin': -5648899.364,
            'y_origin': 4363452.854
        }
    },
    'rap': {
        'type': 'lambert_conformal_conic',
        'proj_params': {
            'proj': 'lcc',
            'lat_1': 25.0,
            'lat_2': 25.0,
            'lat_0': 25.0,
            'lon_0': -95.0,
            'x_0': 0,
            'y_0': 0,
            'R': 6371229,
            'units': 'm'
        },
        'grid_params': {
            'nx': 451,
            'ny': 337,
            'dx': 13545.0,
            'dy': -13545.0,
            'x_origin': -3338927.789,
            'y_origin': 3968999.735
        }
    },
    'rgem': {
        'type': 'polar_stereographic',
        'proj_params': {
            'proj': 'stere',
            'lat_ts': 60.0,
            'lon_0': -111.0,
            'x_0': 0,
            'y_0': 0,
            'R': 6371229,
            'units': 'm'
        },
        'grid_params': {
            'nx': 935,
            'ny': 824,
            'dx': 10000.0,
            'dy': -10000.0,
            'x_origin': -4556441.403,
            'y_origin': 920682.141
        }
    },
    'hwrf': {
        'type': 'latlon',
        'proj_params': {
            'proj': 'longlat',
            'datum': 'WGS84'
        },
        'grid_params': {
            'nx': 601,
            'ny': 601,
            'dx_degrees': 0.015,
            'dy_degrees': 0.015,
        }
    },
    'hmon': {
        'type': 'latlon',
        'proj_params': {
            'proj': 'longlat',
            'datum': 'WGS84'
        },
        'grid_params': {
            'nx': 450,
            'ny': 375,
            'dx_degrees': 0.02,
            'dy_degrees': 0.02,
        }
    },
    'hfsa': {
        'type': 'latlon',
        'proj_params': {
            'proj': 'longlat',
            'datum': 'WGS84'
        },
        'grid_params': {
            'nx': 1001,
            'ny': 801,
            'dx_degrees': 0.019999,
            'dy_degrees': 0.019999,
        }
    },
    'hfsb': {
        'type': 'latlon',
        'proj_params': {
            'proj': 'longlat',
            'datum': 'WGS84'
        },
        'grid_params': {
            'nx': 1001,
            'ny': 801,
            'dx_degrees': 0.019999,
            'dy_degrees': 0.019999,
        }
    },
    'rtma': {
        'type': 'lambert_conformal_conic',
        'proj_params': {
            'proj': 'lcc',
            'lat_1': 25.0,
            'lat_2': 25.0,
            'lat_0': 25.0,
            'lon_0': -95.0,
            'x_0': 0,
            'y_0': 0,
            'R': 6371200, 
        },
        'grid_params': {
            'nx': 2345,
            'ny': 1597,
            'dx': 2539.703,
            'dy': -2539.703,
            'x_origin': -3272421.457,
            'y_origin': 3790842.106
        }
    },
    'mrms': {
        'type': 'latlon',
        'proj_params': {
            'proj': 'longlat',
            'datum': 'WGS84'
        },
        'grid_params': {
            'nx': 7000,
            'ny': 3500,
            'dx_degrees': 0.01,
            'dy_degrees': 0.01,
            'lon_first': 230.005,
            'lat_first': 54.995,
            'lon_last': 299.994998,
            'lat_last': 20.005001
        }
    },
};
