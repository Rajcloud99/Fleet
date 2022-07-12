var app = angular.module("app", []);

/* var pairs = window.location.search.slice(1).split('&');

var result = {};
pairs.forEach(function(pair) {
    pair = pair.split('=');
    result[pair[0]] = decodeURIComponent(pair[1] || '');
}); */

//var data;

app.controller("purchaseOrderCtrl", function($scope, $timeout) {
    var headers = ['sr_no', 'code', 'name', 'brand', 'prnumber', 'uom', 'quantity', 'rate', 'price', 'tax', 'rate_inc_tax'];
    $scope.$on('$viewContentLoaded', function() {
        window.callPhantom();
    });
    /* data.created_at = new Date(data.created_at).toDateString();
    data.currency = 'INR';
    for (var key in data) {
        $scope[key] = data[key];
    } */

    $timeout(function() {
        var t1 = document.getElementById("t1");
        for (var i = 0; i < data.spare.length; i++) {
            var row = t1.insertRow(i + 1);
            for (var j = 0; j < headers.length; j++) {
                row.insertCell(j);
                var value = i + 1;

                var value = data.spare[i][headers[j]];

                switch (headers[j]) {
                    case headers[0]:
                        value = i + 1;
                        break;
                    case headers[10]:
                        value = data.spare[i][headers[10]] * data.spare[i][headers[6]];
                        break;
                }



                row.cells[j].innerHTML = value !== undefined ? value : '';
                row.cells[j].className += 'data ctd calign';
            }
        }

        var row = [];
        row[0] = t1.insertRow(t1.rows.length);
        row[1] = t1.insertRow(t1.rows.length);
        row[2] = t1.insertRow(t1.rows.length);
        for (var j = 0; j < headers.length; j++) {
            row[0].insertCell(j);
            row[1].insertCell(j);
            row[2].insertCell(j);
            switch (j) {
                case 9:
                    row[0].cells[j].innerHTML = 'Sub Total';
                    row[0].cells[j].className += 'data ctd calign bold';
                    row[1].cells[j].innerHTML = 'Freight';
                    row[1].cells[j].className += 'data ctd calign bold';
                    row[2].cells[j].innerHTML = 'Total';
                    row[2].cells[j].className += 'data ctd calign bold';
                    break;
                case 10:
                    row[0].cells[j].innerHTML = data.total !== undefined ? data.total : '';
                    row[0].cells[j].className += 'data ctd calign';
                    row[1].cells[j].innerHTML = data.freight !== undefined ? data.freight : '';
                    row[1].cells[j].className += 'data ctd calign';
                    row[2].cells[j].innerHTML = (parseInt(data.total) + parseInt(data.freight)) !== undefined ? (parseInt(data.total) + parseInt(data.freight)) : '';
                    row[2].cells[j].className += 'data ctd calign';
                    break;
                default:
                    row[0].cells[j].innerHTML = '';
                    row[0].cells[j].className += 'invis';
                    row[1].cells[j].innerHTML = '';
                    row[1].cells[j].className += 'invis';
                    row[2].cells[j].innerHTML = '';
                    row[2].cells[j].className += 'invis';
            }
        }

    }, 1);
});