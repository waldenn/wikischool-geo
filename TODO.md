TODO:

  - BUG: US state resetInfoPane() not working anymore
  - BUG: always make "go up/down" buttons work (when possible)
    - from URL hash
    - from autocomplete
  - BUG: also load country meta-data (extents, newspapers, ...) when open a geohash-url
  - BUG: set correct lat-lon for google-earth in coutry views
  - update URL hash on location changes
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
  - fix nearby-places code

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
  - fly-mode: see https://www.youtube.com/watch?v=Hu8Yd3-WbP4 (at about 11:00)
  - transparency-layering (already possible?): see https://www.youtube.com/watch?v=Hu8Yd3-WbP4 (at about 15:00)

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
