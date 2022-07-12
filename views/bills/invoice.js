var app = angular.module("invoice", []);

var pairs = window.location.search.slice(1).split('&');

var result = {};
pairs.forEach(function(pair) {
    pair = pair.split('=');
    result[pair[0]] = decodeURIComponent(pair[1] || '');
});

var data = JSON.parse(result.data);

var booking_info_headers = ['sl_no', 'trip_no', 'gr_date', 'gr_no', 'gr_type', 'veh_no','route', 'container_no','weight',
 'rate','freight','dtn_amt', 'wt_charge', 'other_charges', 'total']
/*['sl_no', 'trip_no', 'gr_date', 'gr_no', 'veh_no','route', 'consignor_consignee',
    'container_no','weight', 'rate', 'freight','dtn_amt', 'wt_charge', 'other_charges', 'total'
];*/
//veh_type is coming but we are combining it to save space

app.controller("invoiceCtrl", function($scope) {
    for (var key in data) {
        $scope[key] = data[key];
    }
    //$scope.clientData = data.clientData;
    var table = document.getElementById("trips");

    for (var i = 0; i < data.booking_info.length; i++) {
        var row = table.insertRow(i + 1);
        /*for (var j = 0; j < booking_info_headers.length; j++) {
            row.insertCell(j);
            var value = data.booking_info[i][booking_info_headers[j]];
            row.cells[j].innerHTML = value !== undefined ? value : '';
            row.cells[j].className += 'data ctd';
        }*/
        for (var j = 0; j < booking_info_headers.length; j++) {
            row.insertCell(j);
            if(booking_info_headers[j] == "gr_date"){
                var value = new Date(data.booking_info[i][booking_info_headers[j]]).toLocaleDateString();//$filter('date')(data.booking_info[i][booking_info_headers[j]], 'dd-MM-yyyy');
            }else if(booking_info_headers[j] == "other_charges"){
                var value = (data.booking_info[i]['other_charges'] || 0) + (data.booking_info[i]['ovr_wt_chrgs'] || 0) +
                (data.booking_info[i]['gr_charges'] || 0 ) + ( data.booking_info[i]['fuel_price_hike'] || 0);
            }else{
                var value = data.booking_info[i][booking_info_headers[j]];
            }
            row.cells[j].innerHTML = value !== undefined ? value : '';
            row.cells[j].className += 'data ctd myTableWordWrap';
        }
    }

});
