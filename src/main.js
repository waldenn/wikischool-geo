/*
 *  Copyright 2018, Jama Poulsen
 *
 *  See: LICENSE.md
 *
 *  Project by Wikischool (https://wikischool.org)
 *
 *  Code: https://github.com/waldenn/wikischool-geo
 *
 */

let db; // indexedDB
let autoCompleteEnabled = false;

const $ = jQuery;

const osm = new og.layer.XYZ("roadmap", {
  isBaseLayer: true,
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  visibility: true,
  attribution: '<a href="https://www.openstreetmap.org/copyright">&copy; OpenStreetMap</a>'
});

const sat = new og.layer.XYZ("Satellite", {
  isBaseLayer: true,
  url: "https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoiZm94bXVsZGVyODMiLCJhIjoiY2pqYmR3dG5oM2Z1bzNrczJqYm5pODhuNSJ9.Y4DRmEPhb-XSlCR9CAXACQ",
  visibility: false,
  attribution: '<a href="https://www.mapbox.com">&copy; MapBox</a>'
});

const placeLabels = new og.layer.Vector("place names", {
  'nodeCapacity': 2000,
  'scaleByDistance': [0, 600000, 5000000],
  'minZoom': 9,
  'fading': true
});

placeLabels.events.on("mouseenter", function(e) {
  e.renderer.handler.canvas.style.cursor = "pointer";
});

placeLabels.events.on("mouseleave", function(e) {
  e.renderer.handler.canvas.style.cursor = "default";
});

const placeMarkers = new og.layer.Vector("places", {
  'nodeCapacity': 100000,
  //'maxZoom': 9,
  'minZoom': 3,
  'scaleByDistance': [0, 1500000, 3000000],
  'fading': true
});

placeMarkers.events.on("mouseenter", function(e) {
  e.renderer.handler.canvas.style.cursor = "pointer";
});

placeMarkers.events.on("mouseleave", function(e) {
  e.renderer.handler.canvas.style.cursor = "default";
});

placeMarkers.events.on("lclick", function(e) {

  user.city = latinize( e.pickingObject.properties.name );

  console.log(e.pickingObject.properties );

  db.news.where('country').equals( e.pickingObject.properties.ccode2 ).toArray().then(function(matches) {

    setInfo({
      'type': 'city',
      'city_latin': user.city,
      'lat': e.pickingObject._lonlat.lat,
      'lon': e.pickingObject._lonlat.lon,
      'news': matches.sortBy('name'),
    });

    globe.planet.flyLonLat( new og.LonLat(e.pickingObject._lonlat.lon, e.pickingObject._lonlat.lat, user.view_distance) );

  });

});

placeLabels.events.on("lclick", function(e) {

  user.city = latinize( e.pickingObject.properties.name );

  db.news.where('country').equals( e.pickingObject.properties.ccode2 ).toArray().then(function(matches) {

    setInfo({
      'type': 'city',
      'city_latin': user.city,
      'lat': e.pickingObject._lonlat.lat,
      'lon': e.pickingObject._lonlat.lon,
      'news': matches.sortBy('name'),
    });

    globe.planet.flyLonLat( new og.LonLat(e.pickingObject._lonlat.lon, e.pickingObject._lonlat.lat, user.view_distance) );

  });

});

const globe = new og.Globe({
  "target": "globe",
  "name": "Earth",
  //"terrain": new og.terrain.GlobusTerrain(),
  "layers": [osm, sat, placeMarkers],
  "planet": {
    "lightEnabled": false
  },
  "autoActivated": true
  //"sun": { "active": false },
});

//globe.planet.setHeightFactor(1);
globe.planet.addControl( new og.control.LayerSwitcher() );
globe.planet.lightEnabled = false;
globe.planet.RATIO_LOD = 0.75;
globe.planet.fontAtlas.createFont("Lucida Console", "normal", "bold");

let countries;

const user = {
  'ccode2' : '',
  'ccode3' : '', 
  'cname' : '',
  'country_extent' : '',
  'city' : '',
  'state' : '',
  'state_code' : '',
  'cities_loaded' : false,
  'geohash' : '',
  'maximized_map' : false,
  'view_distance' : 10000,
  'searx_host' : 'https://searx.xyz',
};

Array.prototype.sortBy = function(p) {
  return this.slice(0).sort(function(a, b) {
    return (a[p] > b[p]) ? 1 : (a[p] < b[p]) ? -1 : 0;
  });
}

const init = function() {

  jQuery(document).ready(function() {
    initDB();
  });

};

const initDB = function() {

  Dexie.exists("wikischool-geo").then(function(exists) {

    // declare database
    db = new Dexie("wikischool-geo");

    db.version(1).stores({
      countries: "++",
      cities: "id, iso2",
      urbanizations: "++",
      lakes: "++",
      news: "++, country, state",
    });

    // country fields: "scalerank, featurecla, labelrank, sovereignt, sov_a3, adm0_dif, level, type, admin, adm0_a3, geou_dif, geounit, gu_a3, su_dif, subunit, su_a3, brk_diff, name, name_long, brk_a3, brk_name, brk_group, abbrev, postal, formal_en, formal_fr, note_adm0, note_brk, name_sort, name_alt, mapcolor7, mapcolor8, mapcolor9, mapcolor13, pop_est, gdp_md_est, pop_year, lastcensus, gdp_year, economy, income_grp, wikipedia, fips_10, iso_a2, iso_a3, iso_n3, un_a3, wb_a2, wb_a3, woe_id, adm0_a3_is, adm0_a3_us, adm0_a3_un, adm0_a3_wb, continent, region_un, subregion, region_wb, name_len, long_len, abbrev_len, tiny, homepart, geometry_type, geometry_coordinates",

		// city fields: "id, name, name_ascii, aliases, lat, lon, fclass, fcode, iso2, cc2, admin1, admin2, admin3, admin4, pop, elev, dem, tz",

    $('#progressbar').css({ 'width': '10%' }).html('10% ...loading countries');

    if (exists) {

      db.countries.toArray(function(c) {
        countries = c;

        $('#progressbar').css({ 'width': '20%' }).html('20% ...loading cities');

        db.cities.toArray(function(cit) {

          //cities = cit;

          user.cities_loaded = true;
          //console.log('retrieved countries and cities');

          $('#progressbar').css({ 'width': '80%' }).html('80% ...loading visuals');
          main();

        })
      })

    } else {

      // fetch data for DB

      $('#progressbar').css({ 'width': '20%' }).html('20% ...fetching countries');
      //console.log("Database does not yet exist");

      fetch("./data/json/countries.json?v014")

        .then(r => {
          return r.json();
        }).then(countries_ => {

          countries = countries_;

          $('#progressbar').css({ 'width': '30%' }).html('20% ...loading countries');

          // insert data into DB
          db.countries.bulkAdd(countries_).then(function(lastKey) {
            $('#progressbar').css({ 'width': '30%' }).html('30% ...fetching cities');

            //console.log('Done adding ' + countries.length +  ' countries');

            // get city data
            let cities_url = './data/csv/cities.txt?v001';

            Papa.parse(cities_url, {
              download: true,
              delimiter: "", // auto-detect
              header: true,
              fastMode: true,

              complete: function(cities_) {
                $('#progressbar').css({ 'width': '40%' }).html('40% ...storing cities in cache');

                db.cities.bulkAdd(cities_.data).then(function(lastKey) {

                  user.cities_loaded = true;
                  $('#progressbar').css({ 'width': '50%' }).html('50% ...loading urbanizations');

                  fetch("./data/json/urbanizations.json?v005")
                    .then(r => {
                      return r.json();
                    }).then(urbanizations_ => {

                      db.urbanizations.bulkAdd(urbanizations_.features).then(function(lastKey) {

                        $('#progressbar').css({ 'width': '60%' }).html('60% ...loading lakes');

                        fetch("./data/json/lakes.json?v006")
                          .then(r => {
                            return r.json();
                          }).then(lakes_ => {

                            db.lakes.bulkAdd(lakes_.features).then(function(lastKey) {

                                $('#progressbar').css({ 'width': '70%' }).html('70% ...loading news sources');

                                // add news sources
                                Papa.parse('./data/csv/news.csv?004', {

                                  download: true,
                                  delimiter: ",",
                                  header: true,
                                  fastMode: true,

                                  complete: function(news_) {

                                    $('#progressbar').css({ 'width': '75%' }).html('75% ...caching news sources');

                                    db.news.bulkAdd(news_.data).then(function(lastKey) {

                                      $('#progressbar').css({ 'width': '80%' }).html('80% ...loading visuals');
                                      main();

                                    });

                                  },

                                });

                            });

                          });

                       }).catch(Dexie.BulkError, function(e) {
                        console.log('failures: ' + e.failures.length );
                      });

                    });

                });

              },

            });

            $('#progressbar').css({ 'width': '40%' }).html('40% ...loading cities');

          }).catch(Dexie.BulkError, function(e) {
            console.log('failures: ' + e.failures.length);
          });

        }); // end of country fetch

    }

  });

};

const main = function() {

  initGeoData();
  initAutocomplete();
  initButtonEvents();
  checkHashParams();
  addExtraLayers();

};

const initGeoData = function() {

  let countries_ = new og.layer.Vector("Countries", {
    'visibility': true,
    'isBaseLayer': false,
    'diffuse': [0, 0, 0],
    'ambient': [1, 1, 1]
  });

  countries_.addTo(globe.planet);

  $('#progressbar').css({ 'width': '100%' }).html('100%');

   for (let i = 0; i < countries.length; i++) {
    let c = countries[i];
    countries_.add(new og.Entity({
      'id': i,
      'geometry': {
        'type': c.geometry_type,
        'coordinates': c.geometry_coordinates,
        'style': {
          'fillColor': "rgba(255,255,255,0.1)",
        }
      }
    }));

  }

  countries_.events.on("mouseleave", function(e) {
    //e.pickingObject.geometry.setFillColor(1, 1, 1, 0.6);
    e.pickingObject.geometry.setLineColor(0.2, 0.6, 0.8, 1.0);
  });

  countries_.events.on("mouseenter", function(e) {
    e.pickingObject.geometry.bringToFront();
    //e.pickingObject.geometry.setFillColor(1, 0, 0, 0.4);
    e.pickingObject.geometry.setLineColor(1, 0, 0, 1.0);
  });

  countries_.events.on("lclick", function(e) {

    globe.planet.entityCollections = []; // reset

    let obj = countries[e.pickingObject.id];

    //console.log( e.pickingObject );

    if (!user.cities_loaded) {
      console.log('cities data not yet loaded');
      return 1;
    }

    globe.planet.flyExtent(e.pickingObject.geometry.getExtent());

    user.country_extent = e.pickingObject.geometry.getExtent();
    user.ccode2 = obj.iso_a2;
    user.ccode3 = obj.adm0_a3_is;
    user.cname = obj.brk_name;
    user.state_code = obj.name;
    user.city = '';

    if (obj.federal_state) {
      user.state = obj.name;
      user.state_code = us_state_codes[ user.state ];
      console.log('federal state: ' + user.state, user.state_code, user.cname);
    } else {
      user.state = '';
    }

    let c;

    db.cities.where('iso2').equals(user.ccode2).toArray().then(function(matches) {

        c = matches;

      }).then(function() {

        // add city markers and labels
        let labels = [],
          markers = [];

        for (let i = 0; i < c.length; i++) {

          let ri = c[i];

          if ( ri.fcode === 'PPLC' ){ // capital

            markers.push(new og.Entity({
              'lonlat': [parseFloat(ri.lon), parseFloat(ri.lat)],
              'billboard': {
                'src': './assets/img/capital.png',
                'width': 75,
                'height': 75,
                'offset': [0, 6],
              },
              'properties': {
                'name': ri.name,
                'ccode2': ri.iso2,
              }
            }));

            /*
            labels.push(new og.Entity({
              'lonlat': [parseFloat(ri.lon), parseFloat(ri.lat)],
              'label': {
                'text': ri.name,
                'size': 100,
                //'outline': 0,
                'face': "Lucida Console",
                'weight': "bold",
                'color': "#F2F2F2",
                'align': "right",
                'offset': [25, 10]
              },
              'properties': {
                'name': ri.name,
                'ccode2': ri.iso2,
              }
            }));
            */

          }
          else if ( ri.fcode === 'PPL' ){ // populated place

            markers.push(new og.Entity({
              'lonlat': [parseFloat(ri.lon), parseFloat(ri.lat)],
              'billboard': {
                'src': './assets/img/marker.png',
                'width': 35,
                'height': 35,
                'offset': [0, 6],
              },
              'properties': {
                'name': ri.name,
                'ccode2': ri.iso2,
              }
            }));

            /*
            labels.push(new og.Entity({
              'lonlat': [parseFloat(ri.lon), parseFloat(ri.lat)],
              'label': {
                'text': ri.name,
                'size': 35,
                //'outline': 0,
                'face': "Lucida Console",
                'weight': "normal",
                'color': "#F2F2F2",
                'align': "right",
                'offset': [13, 0]
              },
              'properties': {
                'name': ri.name,
                'ccode2': ri.iso2,
              }
            }));
            */


          }
          else { // sparsely populated place

            markers.push(new og.Entity({
              'lonlat': [parseFloat(ri.lon), parseFloat(ri.lat)],
              'billboard': {
                'src': './assets/img/marker.png',
                'width': 20,
                'height': 20,
                'offset': [0, 6],
              },
              'properties': {
                'name': ri.name,
                'ccode2': ri.iso2,
              }
            }));

            /*
            labels.push(new og.Entity({
              'lonlat': [parseFloat(ri.lon), parseFloat(ri.lat)],
              'label': {
                'text': ri.name,
                'size': 25,
                //'outline': 0,
                'face': "Lucida Console",
                'weight': "normal",
                'color': "#F2F2F2",
                'align': "right",
                'offset': [13, 0]
              },
              'properties': {
                'name': ri.name,
                'ccode2': ri.iso2,
              }
            }));
            */

          }

        }

        //placeLabels.setEntities(labels);
        placeMarkers.setEntities(markers);

        // fetch news of this country

        /*
        db.news.where('country').equals(user.ccode2).toArray().then(function(matches) {

          if ( user.state === '') { // country city
            setInfo({
              'type': 'country',
              'news': matches.sortBy('name'),
            });
          } else { // state city

            user.city == '';

            setInfo({
              'type': 'state',
              'news': matches.sortBy('name'),
            });
          }

        })
        */

        if ( user.state === '') { // country city

          db.news.where('country').equals(user.ccode2).toArray().then(function(matches) {

            setInfo({ 'type': 'country', 'news': matches.sortBy('name'), });

          })

        } else { // state city

          user.city == '';

          db.news.where('state').equals(user.state_code).toArray().then(function(matches) {

            setInfo({ 'type': 'state', 'news': matches.sortBy('name'), });

          })
        }

      })
      .catch(function(e) {
        console.log("Error finding in cities: " + (e.stack || e));
      });


    /* FIXME

          let markers = new og.EntityCollection({
              'entities': entities,
              'scaleByDistance': [60000, 2400000, 10000000000]
              //'scaleByDistance': [6000000, 24000000, 10000000000]
          });

          globe.planet.entityCollections = []; // reset

          markers.events.on("lclick", function (e) {

              //console.log( e.pickingObject , user.cname );
              user.city = e.pickingObject.label._text;

              setInfo( { 'type': 'city', 'city_latin': latinize( user.city ), 'lat': e.pickingObject._lonlat.lat, 'lon' : e.pickingObject._lonlat.lon } );

               let pos_ = new og.LonLat( e.pickingObject._lonlat.lon, e.pickingObject._lonlat.lat, user.view_distance );
              globe.planet.flyLonLat( pos_ );

              // fetch nearby of this country
              fetch('https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&list=geosearch&formatversion=1&gscoord=' + e.pickingObject._lonlat.lat +'%7C' + e.pickingObject._lonlat.lon + '&gsradius=10000&gslimit=10')

                  .then(r => {
                      return r.json();
                  }).then( nearbys => {

                    console.log( nearbys.query.geosearch );
                     let nbs = nearbys.query.geosearch;
                    // add these entities

                     let nearby_entities = [];

                    for ( let i = 0; i < nbs.length; i++) {
                          console.log( nbs[i] );

                          // skip item with the same name as the active city 
                          //console.log ( nbs[i].title, ' --- ',  user.city);
                          if ( nbs[i].title == user.city) {
                            continue;
                          }

                          nearby_entities.push(new og.Entity({
                              'name':  nbs[i].title,
                              'label': {
                                  'text': nbs[i].title,
                                  'outline': 0.77,
                                  'outlineColor': "rgba(255,255,255,.4)",
                                  'size': 20,
                                  'color': "black",
                                  'face': "Lucida Console",
                                  'offset': [10, -2]
                              },
                              'lonlat': [ nbs[i].lon , nbs[i].lat , 100 ],
                              'billboard': {
                                  'src': './assets/img/nearby.png',
                                  'size': [20, 20],
                                  'color': 'yellow',
                              },
                              'properties': {
                                  'color': 'yellow'
                              }
                          }));

                    }

                     let nearby_markers = new og.EntityCollection({
                        'entities': nearby_entities,
                        'scaleByDistance': [60000, 2400000, 10000000000]
                        //'scaleByDistance': [6000000, 24000000, 10000000000]
                    });

                    nearby_markers.events.on("lclick", function (e) {

                      console.log( 'https://en.m.wikipedia.org/wiki/' + e.pickingObject.label._text );
                      $('#myframe').attr({"src":'https://en.m.wikipedia.org/wiki/' + e.pickingObject.label._text });
                      //$('a#wikipedia_main')[0].click();


                    });

                    nearby_markers.addTo(globe.planet);

                });

            });

            markers.addTo(globe.planet);

      });
      */

  });

  countries_.events.on("touchstart", function(e) {
    // FIXME call same code by function as for "lclick"
    globe.planet.entityCollections = []; // reset
    globe.planet.flyExtent(e.pickingObject.geometry.getExtent());
  });

};


const initAutocomplete = function() {

  if ( autoCompleteEnabled ){

    let cities_ = new Bloodhound({
      datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
      queryTokenizer: Bloodhound.tokenizers.whitespace,
      remote: '/app/geonames/complete.php?q=%QUERY',
      limit: 30
    });

    cities_.initialize();

    $('#city .typeahead').typeahead(null, {
      name: 'city',
      displayKey: 'value',
      source: cities_.ttAdapter(),
      templates: {
        empty: function(ctx) {
          let encodedStr = ctx.query.replace(/[\u00A0-\u9999<>\&]/gim, function(i) {
            return '&#' + i.charCodeAt(0) + ';';
          });
          return '<div class="tt-suggestion">Sorry, no city names match <b>' + encodedStr + '</b>.</div>';
        },
        suggestion: function(ctx) {
          let country = ctx.country || '',
            s = '<p><strong>' + ctx.asciiname + '</strong>';
          if (country && typeof ctx.admin1 === "string" && ctx.admin1.length > 0 && ctx.admin1.indexOf(ctx.asciiname) != 0) {
            country = ctx.admin1 + ', ' + country;
          }
          if (country) {
            country = ' - <small>' + country + '</small>';
          }
          return s + country + '</p>';
        }
      }

    }).on('typeahead:selected', function(event, loc) {

      // clearing the selection requires a typeahead method
      //$(this).typeahead('setQuery', '');

      user.city = loc.asciiname;
      user.cname = loc.country;

      for (let i = 0; i < countries.length; i++) {

        if (countries[i].admin != undefined && countries[i].admin == user.cname) { // or .sovereignt
          user.ccode2 = countries[i].iso_a2;
          user.ccode3 = countries[i].adm0_a3_is;
          //user.cname = countries.features[i].properties['brk_name'];
          //user.country_extent = countries.features[i].properties.geometry.getExtent();
        }
      }

      user.state = '';

      let mark = [];

      mark.push(new og.Entity({
        'name': user.city,
        'lonlat': [loc.longitude, loc.latitude, 0],
        'billboard': {
          'src': './assets/img/marker.png',
          'size': [25, 25],
          'color': 'yellow',
          //'rotation': rnd(0, 360)
        },
        'label': {
          'text': user.city,
          'size': 40,
          //'outline': 0,
          'face': "Lucida Console",
          'weight': "normal",
          'color': "yellow",
          'align': "right",
          'offset': [13, 0],
        },
        'properties': {
          //'bearing': rnd(0, 360),
          'color': 'yellow',
        }
      }));

      let mark_ = new og.EntityCollection({
        'entities': mark,
        'scaleByDistance': [300000, 500000, 10000000],
      });

      globe.planet.entityCollections = []; // reset

      mark_.addTo(globe.planet);

      // fetch news of this country
      db.news.where('country').equals(user.ccode2).toArray().then(function(matches) {

        setInfo( { 'type': 'city', 'city_latin': latinize( user.city ), 'lat': loc.latitude, 'lon' : loc.longitude, 'news': matches.sortBy('name') } );
        let pos_ = new og.LonLat( loc.longitude, loc.latitude, user.view_distance );
        globe.planet.flyLonLat( pos_ );

      })

    });


    /*
    $( "button#typeahead" ).submit(function( e ) {
      console.log( e );
      event.preventDefault();
    });
    */

    /*
    $('input#city-typeahead').keydown(function(event){

      console.log( 'dont submit' );
      console.log( event );

      if(event.keyCode == 13) {
        event.preventDefault();
        return false;
      }
    });
    */

    //window.addEventListener("hashchange", newHash );

    //$(window).on( "hashchange", function( event ) {
    //  console.log('hash changed' );
    //});

    $('form#typeahead').show();

  }

};

const initButtonEvents = function() {

  $('div.ogLayerSwitcherButton').append('<i class="fas fa-cog" style="color:black;";>');

  $("#goUpButton").on("click", function() {

    //console.log( user.city, user.state, user.cname);

    if (user.cname == undefined) {
      //console.log('do nothing');
    } else if ((user.cname !== undefined || user.cname !== '') && ( user.city == undefined || user.city == '')) {
      //console.log('back to planet');
      globe.planet.camera.setAltitude(20000000);
      user.cname = '';
      user.city = '';
    } else if ( user.city !== undefined || user.city !== '') {
      //console.log('back to country');
      globe.planet.flyExtent(user.country_extent);
      user.city = '';

      db.news.where('country').equals(user.ccode2).toArray().then(function(matches) {

        setInfo( { 'type': 'country', 'news': matches.sortBy('name') } );

      })

    } else if ( user.state !== '') {
      //console.log('back to US country');
    } else {
      //console.log('do nothing');
    }

  });

  $("#maximizeWindowButton").on("click", function() {
    toggleFullScreen()
  });

  $("#maximizeMapButton").on("click", function() {

    if (user.maximized_map) { // go to normal view
      $('span#globe').css('width', '50%');
      $('span#info_pane').show();
      $('span#info_pane').css('left', '50%');
      user.maximized_map = false;
    } else { // go to max view
      $('span#info_pane').hide();
      $('span#globe').css('width', '100%');
      user.maximized_map = true;
    }

  });

  $("#compassButton").on("click", function() {
    //console.log('compass');
    //console.log ( globe.planet.getHeight() );
    //console.log ( globe.planet.getExtentPosition() );
  });

  $('span#globe').css('width', '50%');
  $('span#info_pane').show();
  $('span#info_pane').css('left', '50%');

}


function toggleFullScreen() {

  if ((document.fullScreenElement && document.fullScreenElement !== null) ||
    (!document.mozFullScreen && !document.webkitIsFullScreen)) {
    if (document.documentElement.requestFullScreen) {
      document.documentElement.requestFullScreen();
    } else if (document.documentElement.mozRequestFullScreen) {
      document.documentElement.mozRequestFullScreen();
    } else if (document.documentElement.webkitRequestFullScreen) {
      document.documentElement.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
    }
  } else {
    if (document.cancelFullScreen) {
      document.cancelFullScreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitCancelFullScreen) {
      document.webkitCancelFullScreen();
    }
  }

}

const setInfo = function(options) {

  //console.log( user );

  let flag = '';

  if (!options.extra) { // country, state or city
    flag = '<img title="' + user.cname + ' flag" src="./assets/svg/flags/' + user.ccode3.toLowerCase() + '.svg"' + 'alt="country flag" width="100px" />';
  }

  if (options.extra) { // all sorts of extra geo objects

    let specifier = '';

    let tribes = '';

    if (options.type == 'river') {
      specifier = ' River';
      tribes = '<li><a target="_blank" title="native people" href="https://www.culturalsurvival.org/search/node?keys='+ options.name + specifier.toLowerCase() + '"> <i class="fas fa-child"></i>&nbsp; </a></li>';
    }

    globe.planet.flyExtent(options.extent);

    let type = '&nbsp;&nbsp;<span style="font-size:50%;color:darkgray"> (' + options.type + ')</span>';
    let headline = '<h1>' + options.name + type + '</h1><br/>';

    let wikipedia = '<a href="#"><i class="fab fa-wikipedia"></i> </a>';

    let wikipedia_main = '<a id="wikipedia_main" target="myframe" href="https://en.m.wikipedia.org/wiki/' + options.name + specifier + '"> <i class="fab fa-wikipedia-w"></i> main </a>';
    let wikipedia_search = '<a target="myframe" href="https://en.m.wikipedia.org/w/index.php?title=Special:Search&search=%22' + options.name + '%22&fulltext=Search"> <i class="fab fa-wikipedia-w"></i> search  </a>';

    let web_images = '<a id="web_images" target="myframe" title="photos" href="https://www.bing.com/images/search?&q=%22' + options.name + '%22' + specifier.toLowerCase() + '&qft=+filterui:photo-photo&FORM=IRFLTR"> <i class="far fa-images"></i>&nbsp; </a>';
    let videos = '<a target="myframe" title="videos" href="https://toogl.es/#/search/' + encodeURI(options.name + specifier.toLowerCase()) + '"> <i class="fas fa-video"></i>&nbsp; </a>';
    let archiveorg = '<a target="myframe" title="archive.org" href="https://archive.org/search.php?query=' + encodeURI(options.name + specifier.toLowerCase()) + '"> <i class="fas fa-archive"></i>&nbsp; </a>';
    let searx = '<a target="_blank" title="search" href="' + user.searx_host + '/?q=' + options.name + specifier.toLowerCase() + '"> <i class="fab fa-searchengin"></i>&nbsp; </a>';
    let books = '<a target="myframe" title="books" href="https://wikischool.org/search/'+ options.name + specifier.toLowerCase() + '#g.books"> <i class="fas fa-book"></i>&nbsp; </a>';
    let natgeo = '<a target="_blank" title="national geographic" href="https://www.nationalgeographic.com/search/?q='+ options.name + specifier.toLowerCase() + '"> <i class="fas fa-atlas"></i>&nbsp; </a>';

    //let web_earth = '<a target="_blank" href="https://earth.google.com/web/@' + options.lat + ',' + options.lon + ',146.726a,'+ user.view_distance / 2 +'d,50y,0h,25t,0r"> <i class="fas fa-globe"></i>&nbsp;</a>';

    $("div#info").replaceWith(
      '<div id="info">' +

      headline +

      '<nav><ul>' +

      '<li><a href="#" title="wikipedia menu"><i class="fab fa-wikipedia-w"></i> </a> <ul> <li>' + wikipedia + '</li> <li>' + wikipedia_main + '</li> <li>' + wikipedia_search + '</li></ul>' +

      '<li>' + web_images + '</li>' +
      '<li>' + videos + '</li>' +
      '<li>' + natgeo + '</li>' +
      '<li>' + books + '</li>' +
      '<li>' + searx + '</li>' +
      '<li>' + archiveorg + '</li>' +
      tribes + 

      //'<li>'+ web_earth +'</li>'+

      '</nav>' +

      '</div>'
    );


  } else if ( user.state !== '' && user.city == '') { // state

    let type = '&nbsp;&nbsp;<span style="font-size:50%;color:darkgray">(' + user.cname + ' state)</span>';
    let headline = '<h1>' + user.state + type + '</h1><br/>';

    let wikipedia = '<a href="#"><i class="fab fa-wikipedia"></i> </a>';
    let wikipedia_main = '<a id="wikipedia_main" target="myframe" href="https://en.m.wikipedia.org/wiki/' + user.state + ', ' + user.cname + '"> <i class="fab fa-wikipedia-w"></i> main </a>';
    let wikipedia_portal = '<a target="myframe" href="https://en.m.wikipedia.org/wiki/Portal:' + user.state + '"> <i class="fab fa-wikipedia-w"></i> portal </a>';
    let wikipedia_outline = '<a target="myframe" href="https://en.m.wikipedia.org/wiki/Outline_of_' + user.state + '"> <i class="fab fa-wikipedia-w"></i> outline  </a>';
    let wikipedia_demographics = '<a target="myframe" href="https://en.m.wikipedia.org/wiki/Demographics_of_' + user.state + '"> <i class="fab fa-wikipedia-w"></i> demographics  </a>';
    let wikipedia_history = '<a target="myframe" href="https://en.m.wikipedia.org/wiki/History_of_' + user.state + '"> <i class="fab fa-wikipedia-w"></i> history </a>';
    let wikipedia_culture = '<a target="myframe" href="https://en.m.wikipedia.org/wiki/Culture_of_' + user.state + '"> <i class="fab fa-wikipedia-w"></i> culture </a>';
    let wikipedia_art = '<a target="myframe" href="https://en.m.wikipedia.org/wiki/Art_of_' + user.state + '"> <i class="fab fa-wikipedia-w"></i> art  </a>';
    let wikipedia_search = '<a target="myframe" href="https://en.m.wikipedia.org/w/index.php?title=Special:Search&search=%22' + user.state + ', ' + user.cname + '%22&fulltext=Search"> <i class="fab fa-wikipedia-w"></i> search  </a>';

    let wikischool = '<a href="#"><i class="fas fa-wikischool"></i> </a>';
    let wikischool_main = '<a target="myframe" href="https://wikischool.org/search/' + user.state + ', ' + user.cname + '"> <i class="fas fa-university"></i> main </a>';

    let web_images = '<a id="web_images" target="myframe" title="photos" href="https://www.bing.com/images/search?&q=%22' + user.state + ', ' + user.cname + '%22&qft=+filterui:photo-photo&FORM=IRFLTR"> <i class="far fa-images"></i>&nbsp; </a>';
    let searx = '<a target="_blank" title="search" href="' + user.searx_host + '/?q=' + encodeURI( user.state + ', ' + user.cname) + '"> <i class="fab fa-searchengin"></i>&nbsp; </a>';
    let radio = '<a target="myframe" title="radio stations" href="https://tunein.com/search/?query=' + user.state.toLowerCase() + '"> <i class="fas fa-volume-up"></i>&nbsp; </a>';

    let archiveorg = '<a target="myframe" title="archive.org" href="https://archive.org/search.php?query=' + encodeURI( user.state + ', ' + user.cname) + '"> <i class="fas fa-archive"></i>&nbsp; </a>';
    let videos = '<a target="myframe" title="videos" href="https://toogl.es/#/search/' + encodeURI( user.state + ', ' + user.cname) + '"> <i class="fas fa-video"></i>&nbsp; </a>';
    let web_earth = '<a target="_blank" href="https://earth.google.com/web/@' + options.lat + ',' + options.lon + ',146.726a,' + user.view_distance / 2 + 'd,50y,0h,25t,0r"> <i class="fas fa-globe"></i>&nbsp;</a>';
    let travel = '<a target="myframe" title="travel" href="https://www.tripadvisor.com/Search?q=' + user.state + ', ' + user.cname + '"> <i class="fas fa-suitcase"></i>&nbsp; </a>';
    let art = '<a target="_blank" title="art" href="https://artsandculture.google.com/search?q=' + user.state + ', ' + user.cname + '"> <i class="fas fa-palette"></i>&nbsp; </a>';
    let books = '<a target="myframe" title="books" href="https://wikischool.org/search/'+ user.state + ', ' + user.cname + '#g.books"> <i class="fas fa-book"></i>&nbsp; </a>';
    //let architecture = '<a target="myframe" title="architecture" href="https://worldarchitecture.org/search/?q='+  user.state + ', ' + user.cname + '"> <i class="fab fa-fort-awesome"></i>&nbsp; </a>';
    let natgeo = '<a target="_blank" title="national geographic" href="https://www.nationalgeographic.com/search/?q='+ user.state + '"> <i class="fas fa-atlas"></i>&nbsp; </a>';
    let tribes = '<li class="nps"><a target="_blank" title="native people" href="https://www.culturalsurvival.org/search/node?keys='+ user.state + '"> <i class="fas fa-child"></i> indigenous news</a></li>';
    let gdelt = '';

    let nps = ' ' + gdelt + tribes;

    if ( options.news.length > 0 ){

      for (let i = 0; i < options.news.length; i++) {
        nps = nps + '<li class="nps"><a target="_blank" href="http://' + options.news[i].link + ' ">' + options.news[i].name + '</a> </li>';
      }

    }

    $("div#info").replaceWith(
      '<div id="info">' +

      headline +
      '<div style="position: absolute; right: 0px; top: 0px">' + flag + '</div>' +

      '<nav><ul>' +

      '<li><a href="#" title="wikipedia menu"><i class="fab fa-wikipedia-w"></i> </a> <ul> <li>' + wikipedia + '</li> <li>' + wikipedia_main + '</li> <li>' + wikipedia_portal + ' </li> <li>' + wikipedia_outline + ' </li> <li>' + wikipedia_demographics + ' </li> <li>' + wikipedia_history + '</li> <li>' + wikipedia_culture + '</li> <li>' + wikipedia_art + '</li> <li>' + wikipedia_search + '</li></ul>' +

      '<li>' + web_images + '</li>' +
      '<li>' + videos + '</li>' +
      '<li>' + radio + '</li>' +
      '<li><a href="#" title="news"><i class="far fa-newspaper"></i> </a> <ul class="nps">' + nps + '</li></ul>' +
      '<li>' + natgeo + '</li>' +
      '<li>' + art + '</li>' +
      '<li>' + books + '</li>' +
      '<li>' + web_earth + '</li>' +
      '<li>' + travel + '</li>' +
      //'<li>' + architecture + '</li>' +
      //'<li>' + tribes + '</li>' +
      '<li>' + searx + '</li>' +
      '<li>' + archiveorg + '</li>' +
      //'<li><a href="#" title="wikischool menu"><i class="fas fa-university"></i></a> <ul> <li>' + wikischool + '</li> <li>' + wikischool_main + ' </li> </ul> ' +

      '</nav>' +

      '</div>'
    );

  } else if (options.type == 'country') { // country

    let type = '&nbsp;&nbsp;<span style="font-size:50%;color:darkgray"> (country)</span>';
    let headline = '<h1>' + user.cname + type + '</h1><br/>';

    let wikipedia = '<a href="#"><i class="fab fa-wikipedia"></i> </a>';
    let wikipedia_main = '<a id="wikipedia_main" target="myframe" href="https://en.m.wikipedia.org/wiki/' + user.cname + '"> <i class="fab fa-wikipedia-w"></i> main </a>';
    let wikipedia_portal = '<a target="myframe" href="https://en.m.wikipedia.org/wiki/Portal:' + user.cname + '"> <i class="fab fa-wikipedia-w"></i> portal </a>';
    let wikipedia_outline = '<a target="myframe" href="https://en.m.wikipedia.org/wiki/Outline_of_' + user.cname + '"> <i class="fab fa-wikipedia-w"></i> outline  </a>';
    let wikipedia_demographics = '<a target="myframe" href="https://en.m.wikipedia.org/wiki/Demographics_of_' + user.cname + '"> <i class="fab fa-wikipedia-w"></i> demographics  </a>';
    let wikipedia_history = '<a target="myframe" href="https://en.m.wikipedia.org/wiki/History_of_' + user.cname + '"> <i class="fab fa-wikipedia-w"></i> history </a>';
    let wikipedia_culture = '<a target="myframe" href="https://en.m.wikipedia.org/wiki/Culture_of_' + user.cname + '"> <i class="fab fa-wikipedia-w"></i> culture </a>';
    let wikipedia_art = '<a target="myframe" href="https://en.m.wikipedia.org/wiki/Art_of_' + user.cname + '"> <i class="fab fa-wikipedia-w"></i> art  </a>';
    let wikipedia_search = '<a target="myframe" href="https://en.m.wikipedia.org/w/index.php?title=Special:Search&search=%22' + user.cname + '%22&fulltext=Search"> <i class="fab fa-wikipedia-w"></i> search  </a>';

    let wikischool = '<a href="#"><i class="fas fa-wikischool"></i> </a>';
    let wikischool_main = '<a target="myframe" href="https://wikischool.org/search/' + user.cname + '"> <i class="fas fa-university"></i> main </a>';

    let web_images = '<a id="web_images" target="myframe" title="photos" href="https://www.bing.com/images/search?&q=%22' + user.cname + '%22&qft=+filterui:photo-photo&FORM=IRFLTR"> <i class="far fa-images"></i>&nbsp; </a>';
    let videos = '<a target="myframe" title="videos" href="https://toogl.es/#/search/' + encodeURI(user.cname) + '"> <i class="fas fa-video"></i>&nbsp; </a>';
    let searx = '<a target="_blank" title="search" href="' + user.searx_host + '/?q=' + user.cname + '"> <i class="fab fa-searchengin"></i>&nbsp; </a>';
    let radio = '<a target="myframe" title="radio stations" href="https://tunein.com/search/?query=' + user.cname.toLowerCase() + '"> <i class="fas fa-volume-up"></i>&nbsp; </a>';
    let archiveorg = '<a target="myframe" title="archive.org" href="https://archive.org/search.php?query=' + user.cname.toLowerCase() + '"> <i class="fas fa-archive"></i>&nbsp; </a>';
    let travel = '<a target="myframe" title="travel" href="https://www.tripadvisor.com/Search?q=' + user.cname.toLowerCase() + '"> <i class="fas fa-suitcase"></i>&nbsp; </a>';
    let art = '<a target="_blank" title="art" href="https://artsandculture.google.com/search?q=' + user.cname.toLowerCase() + '"> <i class="fas fa-palette"></i>&nbsp; </a>';
    let books = '<a target="myframe" title="books" href="https://wikischool.org/search/'+ user.cname.toLowerCase() + '#g.books"> <i class="fas fa-book"></i>&nbsp; </a>';
    //let architecture = '<a target="myframe" title="architecture" href="https://worldarchitecture.org/search/?q='+ user.cname.toLowerCase() + '"> <i class="fab fa-fort-awesome"></i>&nbsp; </a>';
    let tribes = '<li class="nps"><a target="_blank" title="native people" href="https://www.culturalsurvival.org/search/node?keys='+ user.cname + '"> <i class="fas fa-child"></i> indigenous news </a></li>';
    let natgeo = '<a target="_blank" title="national geographic" href="https://www.nationalgeographic.com/search/?q='+ user.cname + '"> <i class="fas fa-atlas"></i>&nbsp; </a>';

    // see:
    //  https://blog.gdeltproject.org/announcing-the-gdelt-full-text-search-api/
    //  https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/
    let gdelt_cname = user.cname.replace(/\s/g, '');
    let gdelt  = '<li class="nps"><a target="myframe" href="https://api.gdeltproject.org/api/v1/search_ftxtsearch/search_ftxtsearch?query=sourcecountry:' + gdelt_cname +  '&output=artimglist&outputtype=english&trans=googtrans&maxrows=100&dropdup"> <i class="fas fa-star"></i> GDELT headlines</a></li>';

    let nps = ' ' + gdelt + tribes;

    if ( options.news.length != undefined && options.news.length > 0 ){

      for (let i = 0; i < options.news.length; i++) {
        nps = nps + '<li class="nps"><a target="_blank" href="https://translate.google.com/translate?js=n&sl=auto&tl=destination_language&u=http://' + options.news[i].link + ' ">' + options.news[i].name + '</a> </li>';
      }

    }

    let web_earth = '<a target="_blank" href="https://earth.google.com/web/@' + options.lat + ',' + options.lon + ',146.726a,' + user.view_distance / 2 + 'd,50y,0h,25t,0r"> <i class="fas fa-globe"></i>&nbsp;</a>';

    $("div#info").replaceWith(
      '<div id="info">' +

      headline +
      '<div style="position: absolute; right: 0px; top: 0px">' + flag + '</div>' +

      '<nav><ul>' +

      '<li><a href="#" title="wikipedia menu"><i class="fab fa-wikipedia-w"></i> </a> <ul> <li>' + wikipedia + '</li> <li>' + wikipedia_main + '</li> <li>' + wikipedia_portal + ' </li> <li>' + wikipedia_outline + ' </li> <li>' + wikipedia_demographics + ' </li> <li>' + wikipedia_history + '</li> <li>' + wikipedia_culture + '</li> <li>' + wikipedia_art + '</li> <li>' + wikipedia_search + '</li></ul>' +

      '<li>' + web_images + '</li>' +
      '<li>' + videos + '</li>' +
      '<li>' + radio + '</li>' +
      '<li><a href="#" title="news"><i class="far fa-newspaper"></i> </a> <ul class="nps">' + nps + '</li></ul>' +
      '<li>' + art + '</li>' +
      '<li>' + natgeo + '</li>' +
      '<li>' + books + '</li>' +
      '<li>' + web_earth + '</li>' +
      '<li>' + travel + '</li>' +
      //'<li>' + architecture + '</li>' +
      //'<li>' + tribes + '</li>' +
      '<li>' + searx + '</li>' +
      '<li>' + archiveorg + '</li>' +
      //'<li>' + gdelt + '</li>' +
      //'<li><a href="#" title="wikischool menu"><i class="fas fa-university"></i></a> <ul> <li>' + wikischool + '</li> <li>' + wikischool_main + ' </li> </ul> ' +

      '</nav>' +

      '</div>'
    );

  } else { // city

    let type = '&nbsp;&nbsp;<span style="font-size:50%;color:darkgray"> (' + options.type + ') </span>';

    let state_name = '';

    let web_images = '';
    let nps = '';

    if ( user.state !== '') { // state city

      state_name = ', ' + user.state;
      web_images = '<a target="myframe" title="photos" href="https://www.bing.com/images/search?&q=%22' + options.city_latin + '%22' + state_name + '&qft=+filterui:photo-photo&FORM=IRFLTR"> <i class="far fa-images"></i> &nbsp;</a>';


      if ( options.news.length != undefined && options.news.length > 0 ){

        for (let i = 0; i < options.news.length; i++) {
          nps = nps + '<li class="nps"><a target="_blank" href="http://' + options.news[i].link + ' ">' + options.news[i].name + '</a> </li>';

        }
      }


    }
    else { // country city

      web_images = '<a target="myframe" title="photos" href="https://www.bing.com/images/search?&q=%22' + options.city_latin + '%22' + state_name + ', ' + user.cname + '&qft=+filterui:photo-photo&FORM=IRFLTR"> <i class="far fa-images"></i> &nbsp;</a>';

      if ( options.news.length > 0 ){

        for (let i = 0; i < options.news.length; i++) {
          nps = nps + '<li class="nps"><a target="_blank" href="http://' + options.news[i].link + ' ">' + options.news[i].name + '</a> </li>';

        }
      }


    }

    let headline = '<h1>' + user.city + state_name + ', ' + user.cname + type + '</h1><br/>';

    let wikipedia = '<a href="#"><i class="fab fa-wikipedia"></i> </a>';
    let wikipedia_main = '<a id="wikipedia_main" target="myframe" href="https://en.m.wikipedia.org/wiki/' + options.city_latin + state_name + '"> <i class="fab fa-wikipedia-w"></i> main </a>';
    let wikipedia_portal = '<a target="myframe" href="https://en.m.wikipedia.org/wiki/Portal:' + options.city_latin + state_name + '"> <i class="fab fa-wikipedia-w"></i> portal </a>';
    let wikipedia_outline = '<a target="myframe" href="https://en.m.wikipedia.org/wiki/Outline_of_' + options.city_latin + state_name + '"> <i class="fab fa-wikipedia-w"></i> outline  </a>';
    let wikipedia_demographics = '<a target="myframe" href="https://en.m.wikipedia.org/wiki/Demographics_of_' + options.city_latin + '"> <i class="fab fa-wikipedia-w"></i> demographics  </a>';
    let wikipedia_history = '<a target="myframe" href="https://en.m.wikipedia.org/wiki/History_of_' + options.city_latin + state_name + '"> <i class="fab fa-wikipedia-w"></i> history </a>';
    let wikipedia_culture = '<a target="myframe" href="https://en.m.wikipedia.org/wiki/Culture_of_' + options.city_latin + state_name + '"> <i class="fab fa-wikipedia-w"></i> culture </a>';
    let wikipedia_art = '<a target="myframe" href="https://en.m.wikipedia.org/wiki/Art_of_' + options.city_latin + state_name + '"> <i class="fab fa-wikipedia-w"></i> art  </a>';
    let wikipedia_search = '<a target="myframe" href="https://en.m.wikipedia.org/w/index.php?title=Special:Search&search=%22' + options.city_latin + state_name + '%22&fulltext=Search"> <i class="fab fa-wikipedia-w"></i> search  </a>';

    let wikischool = '<a href="#"><i class="fas fa-university"></i> </a>';
    let wikischool_main = '<a target="myframe" href="https://wikischool.org/search/' + options.city_latin + state_name + ',%20' + user.cname + '"> <i class="fas fa-university"></i> main </a>';
    let wikischool_wikipedia = '<a target="myframe" href="https://wikischool.org/search/%22' + options.city_latin + state_name + '%22,%20' + user.cname + '#wikipedia"> <i class="fas fa-university"></i> wikipedia</a>';
    let wikischool_news = '<a target="myframe" href="https://wikischool.org/search/%22' + options.city_latin + '%22,%20' + state_name + ', ' + user.cname + '#news"> <i class="fas fa-university"></i> news</a>';
    let wikischool_youtube = '<a target="myframe" href="https://wikischool.org/search/%22' + options.city_latin + '%22,%20' + state_name + ', ' + user.cname + '#youtube"> <i class="fas fa-university"></i> youtube</a>';

    let videos = '<a target="myframe" title="videos" href="https://toogl.es/#/search/' + encodeURI( options.city_latin + state_name + ', ' + user.cname) + '"> <i class="fas fa-video"></i>&nbsp; </a>';
    let archiveorg = '<a target="myframe" title="archive.org" href="https://archive.org/search.php?query=' + encodeURI( options.city_latin + state_name + ', ' + user.cname) + '"> <i class="fas fa-archive"></i>&nbsp; </a>';
    let searx = '<a target="_blank" title="search" href="' + user.searx_host + '/?q=%22' + encodeURI(options.city_latin + state_name + '", ' + user.cname) + '"> <i class="fab fa-searchengin"></i>&nbsp; </a>';
    let radio = '<a target="myframe" title="radio stations" href="https://tunein.com/search/?query=' + options.city_latin + '"> <i class="fas fa-volume-up"></i>&nbsp; </a>';

    let travel = '<a target="myframe" title="travel" href="https://www.tripadvisor.com/Search?q=%22' + options.city_latin + state_name + '%22, ' + user.cname + '"> <i class="fas fa-suitcase"></i>&nbsp; </a>';
    let art = '<a target="_blank" title="art" href="https://artsandculture.google.com/search?q=' + options.city_latin + state_name + ', ' + user.cname + '"> <i class="fas fa-palette"></i>&nbsp; </a>';
    let books = '<a target="myframe" title="books" href="https://wikischool.org/search/%22' + options.city_latin + state_name + '%22, ' + user.cname + '#g.books"> <i class="fas fa-book"></i>&nbsp; </a>';
    //let architecture = '<a target="myframe" title="architecture" href="https://worldarchitecture.org/search/?q='+ options.city_latin + '"> <i class="fab fa-fort-awesome"></i>&nbsp; </a>';

    let gdelt_cname = user.cname.replace(/\s/g, '');
    let gdelt  = '<li class="nps"><a target="myframe" href="https://api.gdeltproject.org/api/v1/search_ftxtsearch/search_ftxtsearch?query=sourcecountry:' + gdelt_cname + '&output=artimglist&outputtype=english&trans=googtrans&maxrows=100&dropdup"> <i class="fas fa-star"></i> GDELT headlines </a></li>';

    // see: https://www.gearthblog.com/blog/archives/2017/04/fun-stuff-new-google-earth-url.html
    let web_earth = '<a target="_blank" href="https://earth.google.com/web/@' + options.lat + ',' + options.lon + ',146.726a,' + user.view_distance / 2 + 'd,50y,0h,25t,0r"> <i class="fas fa-globe"></i>&nbsp;</a>';

    let natgeo = '<a target="_blank" title="national geographic" href="https://www.nationalgeographic.com/search/?q='+ options.city_latin + state_name + '"> <i class="fas fa-atlas"></i>&nbsp; </a>';

    $("div#info").replaceWith(
      '<div id="info">' +

      headline +
      '<div style="position: absolute; right: 0px; top: 0px">' + flag + '</div>' +

      '<nav><ul>' +

      '<li><a href="#" title="wikipedia menu"><i class="fab fa-wikipedia-w"></i> </a> <ul> <li>' + wikipedia + '</li> <li>' + wikipedia_main + '</li> <li>' + wikipedia_search + ' </li>  </li></ul>' +
      // FIXME: add wikipedia_history for capitals (and other populated cities)

      '<li>' + web_images + '</li>' +
      '<li>' + videos + '</li>' +
      '<li>' + radio + '</li>' +
      '<li><a href="#" title="news"><i class="far fa-newspaper"></i> </a> <ul class="nps">' + gdelt + nps + '</li></ul>' +
      '<li>' + books + '</li>' +
      '<li>' + natgeo + '</li>' +
      '<li>' + art + '</li>' +
      '<li>' + web_earth + '</li>' +
      '<li>' + searx + '</li>' +
      '<li>' + archiveorg + '</li>' +
      //'<li>' + architecture + '</li>' +
      //'<li><a href="#" title="wikischool menu"><i class="fas fa-university"></i></a> <ul>  <li>' + wikischool_main + ' </li> </ul> ' +

      '</nav>' +

      '</div>'
    );

  }

  $('#myframe').attr({
    "src": ""
  });

  $('a#wikipedia_main')[0].click();
}

const getHashParams = function() {

  let hashParams = {};
  let e,
    a = /\+/g, // Regex for replacing addition symbol with a space
    r = /([^&;=]+)=?([^&;]*)/g,
    d = function(s) {
      return decodeURIComponent(s.replace(a, " "));
    },
    q = window.location.hash.substring(1);

  while (e = r.exec(q)) {
    hashParams[d(e[1])] = d(e[2]);
  }

  return hashParams;
};


const newHash = function() {
  user.geohash = getHashParams();
  //console.log('...hash changed: user query: ', user.geohash);
}

const checkHashParams = function() {

  // URL hash input handling
  user.geohash = getHashParams();
  //console.log('user query: ', user.geohash);

  $('#progressbar').hide();

  if ( user.geohash.lat !== undefined ) {
    // go to URL location

    user.state = '';
    user.city = user.geohash.name;

    for (let i = 0; i < countries.length; i++) {

      if (countries[i].brk_name != undefined && countries[i].brk_name == user.geohash.country) { // or .sovereignt

        user.ccode2 = countries[i].iso_a2;
        user.ccode3 = countries[i].adm0_a3_is;
        user.cname = countries[i].brk_name;
        //user.cname = user.geohash.country;

        // FIXME
        //user.country_extent = new og.Extent(new og.LonLat(180, 90), new og.LonLat(-180, -90));
        //user.country_extent = og.Extent.createByCoordinates( countries[i].geometry_coordinates);
        //console.log( user.country_extent );

      }

    }

    if (user.ccode2 !== undefined && (user.cities_loaded || user.geohash.lat !== '')) {

        // fetch newspapers of this country
        db.news.where('country').equals(user.ccode2).toArray().then(function(matches) {

          setInfo( { 'type': 'city', 'city_latin': latinize( user.geohash.name ), 'lat': user.geohash.lat, 'lon' : user.geohash.lon, 'news': matches.sortBy('name') } );
          let pos_ = new og.LonLat( user.geohash.lon, user.geohash.lat, user.view_distance );
          globe.planet.flyLonLat( pos_ );

        })

    } else {
      //console.log('no country data');
      return 1;
    }

    let mark = [];

    mark.push(new og.Entity({
      'name': user.geohash.name,
      'lonlat': [user.geohash.lon, user.geohash.lat, 0],
      'billboard': {
        'src': './assets/img/marker.png',
        'size': [25, 25],
        'color': 'yellow',
        //'rotation': rnd(0, 360)
      },
      'label': {
        'text': user.geohash.name,
        'size': 40,
        //'outline': 0,
        'face': "Lucida Console",
        'weight': "normal",
        'color': "yellow",
        'align': "right",
        'offset': [13, 0],
      },
      'properties': {
        //'bearing': rnd(0, 360),
        'color': 'yellow',
      }
    }));

    let mark_ = new og.EntityCollection({
      'entities': mark,
      'scaleByDistance': [6000000, 24000000, 10000000000]
    });

    //mark_.events.on("lclick", function (e) {
    //  ...
    //)};

    mark_.addTo(globe.planet);

    let pos_ = new og.LonLat(user.geohash.lon, user.geohash.lat, user.view_distance / 3);
    globe.planet.flyLonLat(pos_);

  }

}

const addExtraLayers = function() {
  addLayerRivers();
  addLayerUrbanizations();
  addLayerSeas();
  addLayerLakes();
  //addLayerPorts();
};

const addLayerRivers = function() {

  fetch("./data/json/rivers.json?v001")
    .then(r => {
      return r.json();
    }).then(data => {

      //console.log( data );

      let rivers = new og.layer.Vector("Rivers", {
        'visibility': true,
        'isBaseLayer': false,
        'diffuse': [0, 0, 0],
        'ambient': [1, 1, 1],
        'zIndex': 20,
      });

      rivers.addTo(globe.planet);

      let f = data.features;

      for (let i = 0; i < f.length; i++) {
        let fi = f[i];

        //console.log( fi.properties.name );

        rivers.add(new og.Entity({
          'properties': {
            'id': fi.properties.name,
            'name': fi.properties.name,
          },
          /*
          'label': {
            'text': fi.properties.name,
            'size': 10,
            //'outline': 0,
            'face': "Lucida Console",
            'weight': "normal",
            'color': "yellow",
            'align': "right",
            'offset': [13, 0],
          },
          */
          'geometry': {
            'type': fi.geometry.type,
            'coordinates': fi.geometry.coordinates,
            'style': {
              //'fillColor': "rgba(150,150,255,0.6)",
              //'fillColor': "rgba(206,206,45,0.8)",
              'lineColor': "rgba(206,206,45,0.9)",
              //'strokeColor': "rgba(206,206,45,0.9)",
              //'strokeWidth': 4,
              //'thickness': 30,
            },
          }
        }));
      }

      rivers.events.on("mouseenter", function(e) {
       e.renderer.handler.canvas.style.cursor = "pointer";
       //e.pickingObject.geometry.bringToFront();
       //e.pickingObject.geometry.setLineColor(206,206,45,0.9);
      });

      rivers.events.on("mouseleave", function(e) {
        //e.pickingObject.geometry.setLineColor(206,206,45,0.9);
        e.renderer.handler.canvas.style.cursor = "default";
      });

      rivers.events.on("lclick", function(e) {
        setInfo({
          'extra': true,
          'type': 'river',
          'name': latinize(e.pickingObject.properties.name),
          'extent': e.pickingObject.geometry.getExtent()
        });
      });

      rivers.events.on("touchstart", function(e) {
        globe.planet.flyExtent(e.pickingObject.geometry.getExtent());
      });
    });
};

const addLayerUrbanizations = function() {

  let u = new og.layer.Vector("Urbanizations", {
    'visibility': true,
    'isBaseLayer': false,
    'diffuse': [0, 0, 0],
    'ambient': [1, 1, 1],
    'maxZoom': 10,
    'zIndex': 10,
    'pickingEnabled': false,
  });

  u.addTo(globe.planet);

	db.urbanizations
		.each (function (urb) {

    u.add(new og.Entity({

      'geometry': {
        'type': urb.geometry.type,
        'coordinates': urb.geometry.coordinates,
        'style': {
          'fillColor': "rgba(200,100,100,0.7)",
          'lineColor': "rgba(200,100,100,0.7)",
          //'strokeWidth': 1,
        },
      }
    }));

  })

  $('#progressbar').hide();
};

const addLayerLakes = function() {

  let l = new og.layer.Vector("Lakes", {
    'visibility': true,
    'isBaseLayer': false,
    'diffuse': [0, 0, 0],
    'ambient': [1, 1, 1],
    'maxZoom': 10,
    'zIndex': 10,
    'pickingEnabled': true,
  });

  l.addTo(globe.planet);

	db.lakes
		.each (function (lake) {

    l.add(new og.Entity({

        'properties': {
          'name': lake.properties.name,
        },
        'geometry': {
          'type': lake.geometry.type,
          'coordinates': lake.geometry.coordinates,
          'style': {
            'fillColor': "rgba(100,100,200,0.7)",
            'lineColor': "rgba(100,100,200,0.9)",
            'strokeWidth': 1,
          },
        },

    }));

  })

  l.events.on("lclick", function(e) {

      setInfo({
        'extra': true,
        'type': 'lake',
        'name': latinize(e.pickingObject.properties.name),
        'extent': e.pickingObject.geometry.getExtent()
      });

  });

};

const addLayerSeas = function() {

  fetch("./data/json/seas.json?v001") // TODO: store in DB?
    .then(r => {
      return r.json();
    }).then(data => {

      let seas = new og.layer.Vector("Seas", {
        'visibility': false,
        'isBaseLayer': false,
        'diffuse': [0, 0, 0],
        'ambient': [1, 1, 1],
        'maxZoom': 6,
      });

      seas.addTo(globe.planet);

      let f = data.features;

      for (let i = 0; i < f.length; i++) {
        let fi = f[i];

        //console.log( fi.properties.name );

        seas.add(new og.Entity({
          'properties': {
            'name': fi.properties.name,
          },
          'geometry': {
            'type': fi.geometry.type,
            'coordinates': fi.geometry.coordinates,
            'style': {
              'fillColor': "rgba(100,100,255,0.5)",
              'lineColor': "rgba(100,100,255,0.7)",
              //'strokeWidth': 1,
            },
          }
        }));
      }

      seas.events.on("mouseleave", function(e) {
        //e.pickingObject.geometry.setLineColor(206,206,45,0.9);
      });

      seas.events.on("mouseenter", function(e) {
        e.pickingObject.geometry.bringToFront();
        //e.pickingObject.geometry.setLineColor(255,255,255, 1.0);
      });

      seas.events.on("lclick", function(e) {
        //console.log(e.pickingObject.properties.name);
        setInfo({
          'extra': true,
          'type': 'sea',
          'name': latinize(e.pickingObject.properties.name),
          'extent': e.pickingObject.geometry.getExtent()
        });
      });

      seas.events.on("touchstart", function(e) {
        globe.planet.flyExtent(e.pickingObject.geometry.getExtent());
      });


    });
};

const addLayerPorts = function() {

  fetch("./data/json/ports.json?v001") // TODO: store in DB?
    .then(r => {
      return r.json();
    }).then(data => {

      let ports = new og.layer.Vector("Sea ports", {
        'visibility': true,
        'isBaseLayer': false,
        'diffuse': [0, 0, 0],
        'ambient': [1, 1, 1],
        //'maxZoom': 6,
      });

      ports.addTo(globe.planet);

      let f = data.features;

      for (let i = 0; i < f.length; i++) {
        let fi = f[i];

        //console.log( fi );

        ports.add(new og.Entity({
          'properties': {
            'name': 'Sea port' + fi.properties.sr_subunit,
            'country': fi.properties.sr_subunit,
            'ccode3': fi.properties.sr_brk_a3,
          },
          //'lonlat': [ 4.4777325,  51.9244201, 1000 ],
          'lonlat': [ fi.geometry.coordinates[0], fi.geometry.coordinates[1], 1 ],
          'billboard': {
            'src': './assets/img/port.png',
            'size': [40, 40],
          },

        }));
      }

      ports.events.on("mouseleave", function(e) {
        //e.pickingObject.geometry.setLineColor(206,206,45,0.9);
      });

      ports.events.on("mouseenter", function(e) {
        //e.pickingObject.geometry.bringToFront();
        //e.pickingObject.geometry.setLineColor(255,255,255, 1.0);
      });

      ports.events.on("lclick", function(e) {
        //console.log(e.pickingObject.properties.name);
        setInfo({
          'extra': true,
          'type': 'port',
          'name': latinize(e.pickingObject.properties.name),
          'extent': e.pickingObject.geometry.getExtent()
        });
      });

      ports.events.on("touchstart", function(e) {
        globe.planet.flyExtent(e.pickingObject.geometry.getExtent());
      });


    });
};



function randombg(){
  let random = Math.floor(Math.random() * 15) + 0;
  document.getElementById("banner").style.backgroundImage = 'url("./assets/wallpapers/' + random + '.jpg")';
}

(function(a,b){'function'==typeof define&&define.amd?define(b):'object'==typeof exports?module.exports=b():a.latinize=b()})(this,function(){function a(b){return'string'==typeof b?b.replace(/[^A-Za-z0-9]/g,function(c){return a.characters[c]||c}):b}return a.characters={Á:'A',Ă:'A',Ắ:'A',Ặ:'A',Ằ:'A',Ẳ:'A',Ẵ:'A',Ǎ:'A',Â:'A',Ấ:'A',Ậ:'A',Ầ:'A',Ẩ:'A',Ẫ:'A',Ä:'A',Ǟ:'A',Ȧ:'A',Ǡ:'A',Ạ:'A',Ȁ:'A',À:'A',Ả:'A',Ȃ:'A',Ā:'A',Ą:'A',Å:'A',Ǻ:'A',Ḁ:'A',Ⱥ:'A',Ã:'A',Ꜳ:'AA',Æ:'AE',Ǽ:'AE',Ǣ:'AE',Ꜵ:'AO',Ꜷ:'AU',Ꜹ:'AV',Ꜻ:'AV',Ꜽ:'AY',Ḃ:'B',Ḅ:'B',Ɓ:'B',Ḇ:'B',Ƀ:'B',Ƃ:'B',Ć:'C',Č:'C',Ç:'C',Ḉ:'C',Ĉ:'C',Ċ:'C',Ƈ:'C',Ȼ:'C',Ď:'D',Ḑ:'D',Ḓ:'D',Ḋ:'D',Ḍ:'D',Ɗ:'D',Ḏ:'D',ǲ:'D',ǅ:'D',Đ:'D',Ƌ:'D',Ǳ:'DZ',Ǆ:'DZ',É:'E',Ĕ:'E',Ě:'E',Ȩ:'E',Ḝ:'E',Ê:'E',Ế:'E',Ệ:'E',Ề:'E',Ể:'E',Ễ:'E',Ḙ:'E',Ë:'E',Ė:'E',Ẹ:'E',Ȅ:'E',È:'E',Ẻ:'E',Ȇ:'E',Ē:'E',Ḗ:'E',Ḕ:'E',Ę:'E',Ɇ:'E',Ẽ:'E',Ḛ:'E',Ꝫ:'ET',Ḟ:'F',Ƒ:'F',Ǵ:'G',Ğ:'G',Ǧ:'G',Ģ:'G',Ĝ:'G',Ġ:'G',Ɠ:'G',Ḡ:'G',Ǥ:'G',Ḫ:'H',Ȟ:'H',Ḩ:'H',Ĥ:'H',Ⱨ:'H',Ḧ:'H',Ḣ:'H',Ḥ:'H',Ħ:'H',Í:'I',Ĭ:'I',Ǐ:'I',Î:'I',Ï:'I',Ḯ:'I',İ:'I',Ị:'I',Ȉ:'I',Ì:'I',Ỉ:'I',Ȋ:'I',Ī:'I',Į:'I',Ɨ:'I',Ĩ:'I',Ḭ:'I',Ꝺ:'D',Ꝼ:'F',Ᵹ:'G',Ꞃ:'R',Ꞅ:'S',Ꞇ:'T',Ꝭ:'IS',Ĵ:'J',Ɉ:'J',Ḱ:'K',Ǩ:'K',Ķ:'K',Ⱪ:'K',Ꝃ:'K',Ḳ:'K',Ƙ:'K',Ḵ:'K',Ꝁ:'K',Ꝅ:'K',Ĺ:'L',Ƚ:'L',Ľ:'L',Ļ:'L',Ḽ:'L',Ḷ:'L',Ḹ:'L',Ⱡ:'L',Ꝉ:'L',Ḻ:'L',Ŀ:'L',Ɫ:'L',ǈ:'L',Ł:'L',Ǉ:'LJ',Ḿ:'M',Ṁ:'M',Ṃ:'M',Ɱ:'M',Ń:'N',Ň:'N',Ņ:'N',Ṋ:'N',Ṅ:'N',Ṇ:'N',Ǹ:'N',Ɲ:'N',Ṉ:'N',Ƞ:'N',ǋ:'N',Ñ:'N',Ǌ:'NJ',Ó:'O',Ŏ:'O',Ǒ:'O',Ô:'O',Ố:'O',Ộ:'O',Ồ:'O',Ổ:'O',Ỗ:'O',Ö:'O',Ȫ:'O',Ȯ:'O',Ȱ:'O',Ọ:'O',Ő:'O',Ȍ:'O',Ò:'O',Ỏ:'O',Ơ:'O',Ớ:'O',Ợ:'O',Ờ:'O',Ở:'O',Ỡ:'O',Ȏ:'O',Ꝋ:'O',Ꝍ:'O',Ō:'O',Ṓ:'O',Ṑ:'O',Ɵ:'O',Ǫ:'O',Ǭ:'O',Ø:'O',Ǿ:'O',Õ:'O',Ṍ:'O',Ṏ:'O',Ȭ:'O',Ƣ:'OI',Ꝏ:'OO',Ɛ:'E',Ɔ:'O',Ȣ:'OU',Ṕ:'P',Ṗ:'P',Ꝓ:'P',Ƥ:'P',Ꝕ:'P',Ᵽ:'P',Ꝑ:'P',Ꝙ:'Q',Ꝗ:'Q',Ŕ:'R',Ř:'R',Ŗ:'R',Ṙ:'R',Ṛ:'R',Ṝ:'R',Ȑ:'R',Ȓ:'R',Ṟ:'R',Ɍ:'R',Ɽ:'R',Ꜿ:'C',Ǝ:'E',Ś:'S',Ṥ:'S',Š:'S',Ṧ:'S',Ş:'S',Ŝ:'S',Ș:'S',Ṡ:'S',Ṣ:'S',Ṩ:'S',ß:'ss',Ť:'T',Ţ:'T',Ṱ:'T',Ț:'T',Ⱦ:'T',Ṫ:'T',Ṭ:'T',Ƭ:'T',Ṯ:'T',Ʈ:'T',Ŧ:'T',Ɐ:'A',Ꞁ:'L',Ɯ:'M',Ʌ:'V',Ꜩ:'TZ',Ú:'U',Ŭ:'U',Ǔ:'U',Û:'U',Ṷ:'U',Ü:'U',Ǘ:'U',Ǚ:'U',Ǜ:'U',Ǖ:'U',Ṳ:'U',Ụ:'U',Ű:'U',Ȕ:'U',Ù:'U',Ủ:'U',Ư:'U',Ứ:'U',Ự:'U',Ừ:'U',Ử:'U',Ữ:'U',Ȗ:'U',Ū:'U',Ṻ:'U',Ų:'U',Ů:'U',Ũ:'U',Ṹ:'U',Ṵ:'U',Ꝟ:'V',Ṿ:'V',Ʋ:'V',Ṽ:'V',Ꝡ:'VY',Ẃ:'W',Ŵ:'W',Ẅ:'W',Ẇ:'W',Ẉ:'W',Ẁ:'W',Ⱳ:'W',Ẍ:'X',Ẋ:'X',Ý:'Y',Ŷ:'Y',Ÿ:'Y',Ẏ:'Y',Ỵ:'Y',Ỳ:'Y',Ƴ:'Y',Ỷ:'Y',Ỿ:'Y',Ȳ:'Y',Ɏ:'Y',Ỹ:'Y',Ź:'Z',Ž:'Z',Ẑ:'Z',Ⱬ:'Z',Ż:'Z',Ẓ:'Z',Ȥ:'Z',Ẕ:'Z',Ƶ:'Z',Ĳ:'IJ',Œ:'OE',ᴀ:'A',ᴁ:'AE',ʙ:'B',ᴃ:'B',ᴄ:'C',ᴅ:'D',ᴇ:'E',ꜰ:'F',ɢ:'G',ʛ:'G',ʜ:'H',ɪ:'I',ʁ:'R',ᴊ:'J',ᴋ:'K',ʟ:'L',ᴌ:'L',ᴍ:'M',ɴ:'N',ᴏ:'O',ɶ:'OE',ᴐ:'O',ᴕ:'OU',ᴘ:'P',ʀ:'R',ᴎ:'N',ᴙ:'R',ꜱ:'S',ᴛ:'T',ⱻ:'E',ᴚ:'R',ᴜ:'U',ᴠ:'V',ᴡ:'W',ʏ:'Y',ᴢ:'Z',á:'a',ă:'a',ắ:'a',ặ:'a',ằ:'a',ẳ:'a',ẵ:'a',ǎ:'a',â:'a',ấ:'a',ậ:'a',ầ:'a',ẩ:'a',ẫ:'a',ä:'a',ǟ:'a',ȧ:'a',ǡ:'a',ạ:'a',ȁ:'a',à:'a',ả:'a',ȃ:'a',ā:'a',ą:'a',ᶏ:'a',ẚ:'a',å:'a',ǻ:'a',ḁ:'a',ⱥ:'a',ã:'a',ꜳ:'aa',æ:'ae',ǽ:'ae',ǣ:'ae',ꜵ:'ao',ꜷ:'au',ꜹ:'av',ꜻ:'av',ꜽ:'ay',ḃ:'b',ḅ:'b',ɓ:'b',ḇ:'b',ᵬ:'b',ᶀ:'b',ƀ:'b',ƃ:'b',ɵ:'o',ć:'c',č:'c',ç:'c',ḉ:'c',ĉ:'c',ɕ:'c',ċ:'c',ƈ:'c',ȼ:'c',ď:'d',ḑ:'d',ḓ:'d',ȡ:'d',ḋ:'d',ḍ:'d',ɗ:'d',ᶑ:'d',ḏ:'d',ᵭ:'d',ᶁ:'d',đ:'d',ɖ:'d',ƌ:'d',ı:'i',ȷ:'j',ɟ:'j',ʄ:'j',ǳ:'dz',ǆ:'dz',é:'e',ĕ:'e',ě:'e',ȩ:'e',ḝ:'e',ê:'e',ế:'e',ệ:'e',ề:'e',ể:'e',ễ:'e',ḙ:'e',ë:'e',ė:'e',ẹ:'e',ȅ:'e',è:'e',ẻ:'e',ȇ:'e',ē:'e',ḗ:'e',ḕ:'e',ⱸ:'e',ę:'e',ᶒ:'e',ɇ:'e',ẽ:'e',ḛ:'e',ꝫ:'et',ḟ:'f',ƒ:'f',ᵮ:'f',ᶂ:'f',ǵ:'g',ğ:'g',ǧ:'g',ģ:'g',ĝ:'g',ġ:'g',ɠ:'g',ḡ:'g',ᶃ:'g',ǥ:'g',ḫ:'h',ȟ:'h',ḩ:'h',ĥ:'h',ⱨ:'h',ḧ:'h',ḣ:'h',ḥ:'h',ɦ:'h',ẖ:'h',ħ:'h',ƕ:'hv',í:'i',ĭ:'i',ǐ:'i',î:'i',ï:'i',ḯ:'i',ị:'i',ȉ:'i',ì:'i',ỉ:'i',ȋ:'i',ī:'i',į:'i',ᶖ:'i',ɨ:'i',ĩ:'i',ḭ:'i',ꝺ:'d',ꝼ:'f',ᵹ:'g',ꞃ:'r',ꞅ:'s',ꞇ:'t',ꝭ:'is',ǰ:'j',ĵ:'j',ʝ:'j',ɉ:'j',ḱ:'k',ǩ:'k',ķ:'k',ⱪ:'k',ꝃ:'k',ḳ:'k',ƙ:'k',ḵ:'k',ᶄ:'k',ꝁ:'k',ꝅ:'k',ĺ:'l',ƚ:'l',ɬ:'l',ľ:'l',ļ:'l',ḽ:'l',ȴ:'l',ḷ:'l',ḹ:'l',ⱡ:'l',ꝉ:'l',ḻ:'l',ŀ:'l',ɫ:'l',ᶅ:'l',ɭ:'l',ł:'l',ǉ:'lj',ſ:'s',ẜ:'s',ẛ:'s',ẝ:'s',ḿ:'m',ṁ:'m',ṃ:'m',ɱ:'m',ᵯ:'m',ᶆ:'m',ń:'n',ň:'n',ņ:'n',ṋ:'n',ȵ:'n',ṅ:'n',ṇ:'n',ǹ:'n',ɲ:'n',ṉ:'n',ƞ:'n',ᵰ:'n',ᶇ:'n',ɳ:'n',ñ:'n',ǌ:'nj',ó:'o',ŏ:'o',ǒ:'o',ô:'o',ố:'o',ộ:'o',ồ:'o',ổ:'o',ỗ:'o',ö:'o',ȫ:'o',ȯ:'o',ȱ:'o',ọ:'o',ő:'o',ȍ:'o',ò:'o',ỏ:'o',ơ:'o',ớ:'o',ợ:'o',ờ:'o',ở:'o',ỡ:'o',ȏ:'o',ꝋ:'o',ꝍ:'o',ⱺ:'o',ō:'o',ṓ:'o',ṑ:'o',ǫ:'o',ǭ:'o',ø:'o',ǿ:'o',õ:'o',ṍ:'o',ṏ:'o',ȭ:'o',ƣ:'oi',ꝏ:'oo',ɛ:'e',ᶓ:'e',ɔ:'o',ᶗ:'o',ȣ:'ou',ṕ:'p',ṗ:'p',ꝓ:'p',ƥ:'p',ᵱ:'p',ᶈ:'p',ꝕ:'p',ᵽ:'p',ꝑ:'p',ꝙ:'q',ʠ:'q',ɋ:'q',ꝗ:'q',ŕ:'r',ř:'r',ŗ:'r',ṙ:'r',ṛ:'r',ṝ:'r',ȑ:'r',ɾ:'r',ᵳ:'r',ȓ:'r',ṟ:'r',ɼ:'r',ᵲ:'r',ᶉ:'r',ɍ:'r',ɽ:'r',ↄ:'c',ꜿ:'c',ɘ:'e',ɿ:'r',ś:'s',ṥ:'s',š:'s',ṧ:'s',ş:'s',ŝ:'s',ș:'s',ṡ:'s',ṣ:'s',ṩ:'s',ʂ:'s',ᵴ:'s',ᶊ:'s',ȿ:'s',ɡ:'g',ᴑ:'o',ᴓ:'o',ᴝ:'u',ť:'t',ţ:'t',ṱ:'t',ț:'t',ȶ:'t',ẗ:'t',ⱦ:'t',ṫ:'t',ṭ:'t',ƭ:'t',ṯ:'t',ᵵ:'t',ƫ:'t',ʈ:'t',ŧ:'t',ᵺ:'th',ɐ:'a',ᴂ:'ae',ǝ:'e',ᵷ:'g',ɥ:'h',ʮ:'h',ʯ:'h',ᴉ:'i',ʞ:'k',ꞁ:'l',ɯ:'m',ɰ:'m',ᴔ:'oe',ɹ:'r',ɻ:'r',ɺ:'r',ⱹ:'r',ʇ:'t',ʌ:'v',ʍ:'w',ʎ:'y',ꜩ:'tz',ú:'u',ŭ:'u',ǔ:'u',û:'u',ṷ:'u',ü:'u',ǘ:'u',ǚ:'u',ǜ:'u',ǖ:'u',ṳ:'u',ụ:'u',ű:'u',ȕ:'u',ù:'u',ủ:'u',ư:'u',ứ:'u',ự:'u',ừ:'u',ử:'u',ữ:'u',ȗ:'u',ū:'u',ṻ:'u',ų:'u',ᶙ:'u',ů:'u',ũ:'u',ṹ:'u',ṵ:'u',ᵫ:'ue',ꝸ:'um',ⱴ:'v',ꝟ:'v',ṿ:'v',ʋ:'v',ᶌ:'v',ⱱ:'v',ṽ:'v',ꝡ:'vy',ẃ:'w',ŵ:'w',ẅ:'w',ẇ:'w',ẉ:'w',ẁ:'w',ⱳ:'w',ẘ:'w',ẍ:'x',ẋ:'x',ᶍ:'x',ý:'y',ŷ:'y',ÿ:'y',ẏ:'y',ỵ:'y',ỳ:'y',ƴ:'y',ỷ:'y',ỿ:'y',ȳ:'y',ẙ:'y',ɏ:'y',ỹ:'y',ź:'z',ž:'z',ẑ:'z',ʑ:'z',ⱬ:'z',ż:'z',ẓ:'z',ȥ:'z',ẕ:'z',ᵶ:'z',ᶎ:'z',ʐ:'z',ƶ:'z',ɀ:'z',ﬀ:'ff',ﬃ:'ffi',ﬄ:'ffl',ﬁ:'fi',ﬂ:'fl',ĳ:'ij',œ:'oe',ﬆ:'st',ₐ:'a',ₑ:'e',ᵢ:'i',ⱼ:'j',ₒ:'o',ᵣ:'r',ᵤ:'u',ᵥ:'v',ₓ:'x',Ё:'YO',Й:'I',Ц:'TS',У:'U',К:'K',Е:'E',Н:'N',Г:'G',Ш:'SH',Щ:'SCH',З:'Z',Х:'H',Ъ:'\'',ё:'yo',й:'i',ц:'ts',у:'u',к:'k',е:'e',н:'n',г:'g',ш:'sh',щ:'sch',з:'z',х:'h',ъ:'\'',Ф:'F',Ы:'I',В:'V',А:'a',П:'P',Р:'R',О:'O',Л:'L',Д:'D',Ж:'ZH',Э:'E',ф:'f',ы:'i',в:'v',а:'a',п:'p',р:'r',о:'o',л:'l',д:'d',ж:'zh',э:'e',Я:'Ya',Ч:'CH',С:'S',М:'M',И:'I',Т:'T',Ь:'\'',Б:'B',Ю:'YU',я:'ya',ч:'ch',с:'s',м:'m',и:'i',т:'t',ь:'\'',б:'b',ю:'yu'},a});

const hashString = function(s) {
    /* Simple hash function. */
    var a = 1, c = 0, h, o;
    if (s) {
        a = 0;
        /*jshint plusplus:false bitwise:false*/
        for (h = s.length - 1; h >= 0; h--) {
            o = s.charCodeAt(h);
            a = (a<<6&268435455) + o + (o<<14);
            c = a & 266338304;
            a = c!==0?a^c>>21:a;
        }
    }
    return String(a);
};

const us_state_codes = {
  "Alabama": "AL",
  "Alaska": "AK",
  "American Samoa": "AS",
  "Arizona": "AZ",
  "Arkansas": "AR",
  "California": "CA",
  "Colorado": "CO",
  "Connecticut": "CT",
  "Delaware": "DE",
  "District Of Columbia": "DC",
  "Federated States Of Micronesia": "FM",
  "Florida": "FL",
  "Georgia": "GA",
  "Guam": "GU",
  "Hawaii": "HI",
  "Idaho": "ID",
  "Illinois": "IL",
  "Indiana": "IN",
  "Iowa": "IA",
  "Kansas": "KS",
  "Kentucky": "KY",
  "Louisiana": "LA",
  "Maine": "ME",
  "Marshall Islands": "MH",
  "Maryland": "MD",
  "Massachusetts": "MA",
  "Michigan": "MI",
  "Minnesota": "MN",
  "Mississippi": "MS",
  "Missouri": "MO",
  "Montana": "MT",
  "Nebraska": "NE",
  "Nevada": "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  "Northern Mariana Islands": "MP",
  "Ohio": "OH",
  "Oklahoma": "OK",
  "Oregon": "OR",
  "Palau": "PW",
  "Pennsylvania": "PA",
  "Puerto Rico": "PR",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  "Tennessee": "TN",
  "Texas": "TX",
  "Utah": "UT",
  "Vermont": "VT",
  "Virgin Islands": "VI",
  "Virginia": "VA",
  "Washington": "WA",
  "West Virginia": "WV",
  "Wisconsin": "WI",
  "Wyoming": "WY"
};

init();
