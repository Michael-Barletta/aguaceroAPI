const a = {
  arome1: {
    type: "latlon",
    proj_params: {
      proj: "longlat",
      datum: "WGS84"
    },
    grid_params: {
      nx: 2801,
      ny: 1791,
      dx_degrees: 0.01,
      dy_degrees: 0.01,
      lon_first: 348,
      lat_first: 55.4,
      lon_last: 16,
      lat_last: 37.5
    }
  },
  arome25: {
    type: "latlon",
    proj_params: {
      proj: "longlat",
      datum: "WGS84"
    },
    grid_params: {
      nx: 1121,
      ny: 717,
      dx_degrees: 0.025,
      dy_degrees: 0.025,
      lon_first: 348,
      lat_first: 55.4,
      lon_last: 16,
      lat_last: 37.5
    }
  },
  arpegeeu: {
    type: "latlon",
    proj_params: {
      proj: "longlat",
      datum: "WGS84"
    },
    grid_params: {
      nx: 741,
      ny: 521,
      dx_degrees: 0.1,
      dy_degrees: 0.1,
      lon_first: 328,
      lat_first: 72,
      lon_last: 42,
      lat_last: 20
    }
  },
  arw: {
    type: "lambert_conformal_conic",
    proj_params: {
      proj: "lcc",
      lat_1: 25,
      lat_2: 25,
      lat_0: 25,
      lon_0: -95,
      x_0: 0,
      y_0: 0,
      R: 6371229,
      units: "m"
    },
    grid_params: {
      nx: 1473,
      ny: 1025,
      dx: 5079,
      dy: -5079,
      x_origin: -4228646497e-3,
      y_origin: 4370737239e-3
    }
  },
  ecmwf: {
    type: "latlon",
    proj_params: {
      proj: "longlat",
      datum: "WGS84"
    },
    grid_params: {
      nx: 1440,
      ny: 721,
      dx_degrees: 0.25,
      dy_degrees: 0.25,
      lon_first: 180,
      lat_first: 90,
      lon_last: 179.75,
      lat_last: -90
    }
  },
  gefs: {
    type: "latlon",
    proj_params: {
      proj: "longlat",
      datum: "WGS84"
    },
    grid_params: {
      nx: 720,
      ny: 361,
      dx_degrees: 0.5,
      dy_degrees: 0.5,
      lon_first: 0,
      lat_first: 90,
      lon_last: 359.5,
      lat_last: -90
    }
  },
  gem: {
    type: "latlon",
    proj_params: {
      proj: "longlat",
      datum: "WGS84"
    },
    grid_params: {
      nx: 2400,
      ny: 1201,
      dx_degrees: 0.15,
      dy_degrees: 0.15,
      lon_first: 180,
      lat_first: -90,
      lon_last: 179.85,
      lat_last: 90
    }
  },
  gfs: {
    type: "latlon",
    proj_params: {
      proj: "longlat",
      datum: "WGS84"
    },
    grid_params: {
      nx: 1440,
      ny: 721,
      dx_degrees: 0.25,
      dy_degrees: 0.25,
      lon_first: 0,
      lat_first: -90,
      lon_last: 359.75,
      lat_last: 90
    }
  },
  hrdps: {
    type: "rotated_latlon",
    proj_params: {
      proj: "ob_tran",
      o_proj: "longlat",
      o_lat_p: 53.91148,
      o_lon_p: 245.305142,
      lon_0: 0,
      datum: "WGS84"
    },
    grid_params: {
      nx: 2540,
      ny: 1290,
      dx_degrees: 0.0225,
      dy_degrees: -0.0225,
      lon_first: -14.83247,
      lat_first: 16.711251,
      lon_last: 42.317533,
      lat_last: -12.313751
    }
  },
  hrrr: {
    type: "lambert_conformal_conic",
    proj_params: {
      proj: "lcc",
      lat_1: 38.5,
      lat_2: 38.5,
      lat_0: 38.5,
      lon_0: -97.5,
      x_0: 0,
      y_0: 0,
      R: 6371229,
      units: "m"
    },
    grid_params: {
      nx: 1799,
      ny: 1059,
      dx: 3e3,
      dy: -3e3,
      x_origin: -269902014252193e-8,
      y_origin: 1.5881938474433357e6
    }
  },
  icond2: {
    type: "latlon",
    proj_params: {
      proj: "longlat",
      datum: "WGS84"
    },
    grid_params: {
      nx: 1215,
      ny: 746,
      dx_degrees: 0.02,
      dy_degrees: 0.02,
      lon_first: 356.06,
      lat_first: 43.18,
      lon_last: 20.34,
      lat_last: 58.08
    }
  },
  iconeu: {
    type: "latlon",
    proj_params: {
      proj: "longlat",
      datum: "WGS84"
    },
    grid_params: {
      nx: 1377,
      ny: 657,
      dx_degrees: 0.0625,
      dy_degrees: 0.0625,
      lon_first: 336.5,
      lat_first: 29.5,
      lon_last: 62.5,
      lat_last: 70.5
    }
  },
  nam: {
    type: "lambert_conformal_conic",
    proj_params: {
      proj: "lcc",
      lat_1: 50,
      lat_2: 50,
      lat_0: 50,
      lon_0: -107,
      x_0: 0,
      y_0: 0,
      R: 6371229,
      units: "m"
    },
    grid_params: {
      nx: 349,
      ny: 277,
      dx: 32463,
      dy: -32463,
      x_origin: -5648899364e-3,
      y_origin: 4363452854e-3
    }
  },
  rap: {
    type: "lambert_conformal_conic",
    proj_params: {
      proj: "lcc",
      lat_1: 25,
      lat_2: 25,
      lat_0: 25,
      lon_0: -95,
      x_0: 0,
      y_0: 0,
      R: 6371229,
      units: "m"
    },
    grid_params: {
      nx: 451,
      ny: 337,
      dx: 13545,
      dy: -13545,
      x_origin: -3338927789e-3,
      y_origin: 3968999735e-3
    }
  },
  rgem: {
    type: "polar_stereographic",
    proj_params: {
      proj: "stere",
      lat_ts: 60,
      lon_0: -111,
      x_0: 0,
      y_0: 0,
      R: 6371229,
      units: "m"
    },
    grid_params: {
      nx: 935,
      ny: 824,
      dx: 1e4,
      dy: -1e4,
      x_origin: -4556441403e-3,
      y_origin: 920682.141
    }
  },
  hwrf: {
    type: "latlon",
    proj_params: {
      proj: "longlat",
      datum: "WGS84"
    },
    grid_params: {
      nx: 601,
      ny: 601,
      dx_degrees: 0.015,
      dy_degrees: 0.015
    }
  },
  hmon: {
    type: "latlon",
    proj_params: {
      proj: "longlat",
      datum: "WGS84"
    },
    grid_params: {
      nx: 450,
      ny: 375,
      dx_degrees: 0.02,
      dy_degrees: 0.02
    }
  },
  hfsa: {
    type: "latlon",
    proj_params: {
      proj: "longlat",
      datum: "WGS84"
    },
    grid_params: {
      nx: 1001,
      ny: 801,
      dx_degrees: 0.019999,
      dy_degrees: 0.019999
    }
  },
  hfsb: {
    type: "latlon",
    proj_params: {
      proj: "longlat",
      datum: "WGS84"
    },
    grid_params: {
      nx: 1001,
      ny: 801,
      dx_degrees: 0.019999,
      dy_degrees: 0.019999
    }
  },
  rtma: {
    type: "lambert_conformal_conic",
    proj_params: {
      proj: "lcc",
      lat_1: 25,
      lat_2: 25,
      lat_0: 25,
      lon_0: -95,
      x_0: 0,
      y_0: 0,
      R: 6371200
    },
    grid_params: {
      nx: 2345,
      ny: 1597,
      dx: 2539.703,
      dy: -2539.703,
      x_origin: -3272421457e-3,
      y_origin: 3790842106e-3
    }
  },
  mrms: {
    type: "latlon",
    proj_params: {
      proj: "longlat",
      datum: "WGS84"
    },
    grid_params: {
      nx: 7e3,
      ny: 3500,
      dx_degrees: 0.01,
      dy_degrees: 0.01,
      lon_first: 230.005,
      lat_first: 54.995,
      lon_last: 299.994998,
      lat_last: 20.005001
    }
  }
};
export {
  a as COORDINATE_CONFIGS
};
