(function(){
  'use strict';
  function start(){
    var el=document.getElementById('homeRouteMap');
    if(!el||!window.L||el.dataset.ready)return;
    el.dataset.ready='1';
    var map=L.map(el,{zoomControl:false,scrollWheelZoom:true,preferCanvas:true}).setView([49,96],3);
    L.control.zoom({position:'topright'}).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      maxZoom:19,subdomains:'abc',
      attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
    }).addTo(map);
    var layers=L.layerGroup().addTo(map), markers=L.layerGroup().addTo(map);
    var cities={
      shanghai:{name:'Шанхай',country:'Китай',ll:[31.2304,121.4737],kind:'city'},
      manzhouli:{name:'Маньчжурия',country:'Китай',ll:[49.5989,117.3784],kind:'border'},
      zabaikalsk:{name:'Забайкальск',country:'Россия',ll:[49.6514,117.3266],kind:'border'},
      novosibirsk:{name:'Новосибирск',country:'Россия',ll:[55.0084,82.9357],kind:'city'},
      yekaterinburg:{name:'Екатеринбург',country:'Россия',ll:[56.8389,60.6057],kind:'city'},
      moscow:{name:'Москва',country:'Россия',ll:[55.7558,37.6173],kind:'city'},
      khorgos:{name:'Хоргос',country:'Китай',ll:[44.2075,80.4128],kind:'border'},
      altynkol:{name:'Алтынколь',country:'Казахстан',ll:[45.979,82.611],kind:'border'},
      dostyk:{name:'Достык',country:'Казахстан',ll:[45.253,82.493],kind:'border'},
      vladivostok:{name:'Владивосток',country:'Россия',ll:[43.1155,131.8855],kind:'city'},
      suifenhe:{name:'Суйфэньхэ',country:'Китай',ll:[44.3998,131.1575],kind:'border'},
      grodekovo:{name:'Гродеково',country:'Россия',ll:[44.399,131.291],kind:'border'},
      heihe:{name:'Хэйхэ',country:'Китай',ll:[50.2458,127.5285],kind:'border'},
      blagoveshchensk:{name:'Благовещенск',country:'Россия',ll:[50.2906,127.5272],kind:'city'}
    };
    var routes={
      rail:[
        {name:'Восточный ж/д коридор',nodes:['shanghai','manzhouli','zabaikalsk','novosibirsk','yekaterinburg','moscow'],dash:null},
        {name:'Западный ж/д коридор через Казахстан',nodes:['shanghai','khorgos','altynkol','dostyk','yekaterinburg','moscow'],dash:'6 5'}
      ],
      road:[
        {name:'Сухопутный коридор через Маньчжурию',nodes:['shanghai','manzhouli','zabaikalsk','novosibirsk','yekaterinburg','moscow'],dash:'2 5'},
        {name:'Дальний Восток',nodes:['shanghai','suifenhe','grodekovo','vladivostok'],dash:'2 5'}
      ],
      air:[{name:'Авиационный маршрут (ориентировочно)',nodes:['shanghai','moscow'],dash:'3 7'}],
      sea:[{name:'Море + железная дорога через Владивосток',nodes:['shanghai','vladivostok'],dash:null},{name:'Дальнейшее ж/д плечо до Москвы',nodes:['vladivostok','moscow'],dash:'6 5'}]
    };
    var colors={rail:'#111',road:'#555',air:'#777',sea:'#222'};
    function markerIcon(kind){return L.divIcon({className:'',html:'<span class="home-route-marker '+(kind==='border'?'is-border':'is-city')+'"></span>',iconSize:[14,14],iconAnchor:[7,7]});}
    Object.keys(cities).forEach(function(id){
      var c=cities[id];
      var marker=L.marker(c.ll,{icon:markerIcon(c.kind),title:c.name,alt:c.name,keyboard:true});
      marker.bindPopup('<div><strong>'+c.name+'</strong><br><small>'+c.country+' · узел коридора</small></div>',{className:'home-route-popup',closeButton:false});
      marker.addTo(markers);
    });
    function draw(mode){
      layers.clearLayers();
      Object.keys(routes).forEach(function(kind){
        if(mode!=='all'&&mode!==kind)return;
        routes[kind].forEach(function(r){
          var points=r.nodes.map(function(id){return cities[id].ll;});
          L.polyline(points,{color:colors[kind],weight:kind==='air'?1.8:2.4,opacity:mode==='all'?.78:.95,dashArray:r.dash,lineCap:'round',lineJoin:'round'}).addTo(layers)
            .bindPopup('<strong>'+r.name+'</strong><br><small>Ориентировочная линия коридора · не трек перевозчика</small>',{className:'home-route-popup',closeButton:false});
        });
      });
      document.querySelectorAll('[data-home-map-mode]').forEach(function(b){b.classList.toggle('is-active',b.dataset.homeMapMode===mode);});
    }
    document.querySelectorAll('[data-home-map-mode]').forEach(function(b){b.addEventListener('click',function(){draw(b.dataset.homeMapMode);});});
    var fit=document.querySelector('[data-home-map-fit]');
    if(fit)fit.addEventListener('click',function(){map.fitBounds([[28,30],[61,140]],{padding:[18,18],animate:true});});
    document.querySelectorAll('[data-open-route-mode]').forEach(function(elm){elm.addEventListener('click',function(){draw(elm.getAttribute('data-open-route-mode'));});});
    draw('all');
    map.fitBounds([[28,30],[61,140]],{padding:[12,12]});
    window.addEventListener('resize',function(){map.invalidateSize();});
    var themeObserver=new MutationObserver(function(){
      el.classList.toggle('is-dark-map',document.documentElement.classList.contains('dark'));
    });
    themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
    setTimeout(function(){map.invalidateSize();},180);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();