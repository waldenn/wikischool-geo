TODO:

  - add random location button

  - make extents work reliably (wheter coming from a browse, geohash or autocomplete mode)
    - UP: one level up (unless at planet scale)
    - DOWN: one level down (unless at city scale)
      country -> capital
      
  - update URL hash, respond to URL hash updates
    - make html5 history work

  - stop zooming out after a certain scale

  ---------------------

  - add US news sources
    - don't translate news for english-speaking countries: Antigua and Barbuda, Australia, The Bahamas, Barbados, Belize, Canada*, Dominica, Grenada, Guyana, Ireland, Jamaica, New Zealand, St Kitts and Nevis, St Lucia, St Vincent and the Grenadines, Trinidad and Tobago, United Kingdom, United States of America,

  - allow multi-phrase search in #geo searches (OR: remove extra phrases after the first comma)

  country -> continent mapping:
    https://gist.githubusercontent.com/indexzero/11338529/raw/c0095d8943aea3a5751c21f8fa8a1fcd7a3bd6e7/continents.json

  CIA fact book:
    https://github.com/waldenn/factbook.json

  - world sea ports
    https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_10m_admin_0_label_points.geojson
    https://github.com/marchah/sea-ports/blob/master/lib/ports.json
    https://raw.githubusercontent.com/mapbox/ios-sdk-examples/master/Examples/Files/ports.geojson

  - BUG: set correct lat-lon for google-earth in coutry views

  - indicate country-capitals (and US-state-capitals)
  
  - implement button to re-align the North-South axis with the screen from any app state
  
  - country data fixes / addons:
    - setup custom view-port for viewing Denmark, France, UK, ...
    - add missing countries (Kiribati, etc.)
    - fix bad country geometries (eg. Denmark Fyn)
    
  - cleanup code structure
    - use a nodejs template
    - consider something like Svelte Sapper for a better application structure? https://sapper.svelte.technology/
    - rewrite the few jQuery uses in vanilla JS?
    
  - better HTML templating system needed?

  - more robust wikipedia-article checking algorithm:
    - options:
        [1] city
        [2] city, state
        [3] city, country
    - first check [1], as most city articles can be accessed in this way
      - if the place is within the US: check [2]
      - if no article is found or an ambiguation article is found: check [3]
        - if the place is within the US: show a search for [2]
        - else show a search for [3]

  - add other types of data overlays:
    - lakes: http://geojson.io/#map=7/-3.058/31.333 (needs annotion: name, country codes)
    - http://geocommons.com/search.html
    - https://worldmap.harvard.edu/maps/search?sort=last_modified&dir=DESC
    - http://geojson.xyz/
    - violence: https://www.acleddata.com/data/

  - how to allow the user to create simple queries over the DB:
    - ...

  - smarter city menu
    - history of <city> (if its a capital)
    - ...

To consider:

  - Google Earth mouse-controls ??
  
  - general keyboard navigation controls (show onscreen help for these)
    - ...
    - arrow-key movement
    
  - specific keyboard navigation controls

  - timeline slider concept:
    https://ourworldindata.org/slides/war-and-violence/#/11
    https://www.jqueryscript.net/form/Draggable-Range-Selection-Plugin-JQDRangeSlider.html

    - possible timeline topics:
      - human conflict
          - http://nodegoat.net/blog.p/82.m/14/a-wikidatadbpedia-geography-of-violence
          link;label;date;date_formatted;lat;lon
          link;label;lat;lon;date
      - political regime types
          - https://ourworldindata.org/slides/war-and-violence/#/11
      - ecology: water (seas, rivers, groundwater), air (smog), land (waste management, deforestation, mining, ...)
      - inter-country trade
      - mining
      - expanding earth theory
      - out-of-india migration theory
      - spirituality / religions / tribes
