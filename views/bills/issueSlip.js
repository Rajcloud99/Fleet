var app = angular.module("app", []);

var pairs = window.location.search.slice(1).split('&');

var result = {};
pairs.forEach(function(pair) {
    pair = pair.split('=');
    result[pair[0]] = decodeURIComponent(pair[1] || '');
});

console.log('res data', result.data);

var data = JSON.parse(result.data);

// var data = {
//     client_full_name: 'Futuretrucks',
// 	slip_no: 12345,
//     job_card_no: 234,
//     vehicle_no: 'qwerty123',
//     mechanic_name: 'abc',
//     supervisor_name: 'zxc',
//     datetime: new Date().toDateString(),
//     job_card_type: 'type',
//     branch_name: 'Branch',
//     issued_by: 'feroz',
//     verified_by: 'aaaaaaaa',
//     received_by: 'ccccccc',
//     reprinted_by: 'ddddddddddddddeeeeee',
//
//
//
// 	data: []
//
// }

console.log(data);

var headers = ['sl_no', 'spare_code', 'spare_name', 'category_name', 'uom', 'quantity', 'cost_per_piece', 'total', 'remarks'];

app.controller("issueSlipCtrl", function($scope) {
    totalData = 0;
	var d = new Date();
	data.datetime = ("00" + (d.getMonth() + 1)).slice(-2) + "/" +
    ("00" + d.getDate()).slice(-2) + "/" +
    d.getFullYear() + " " +
    ("00" + d.getHours()).slice(-2) + ":" +
    ("00" + d.getMinutes()).slice(-2) + ":" +
    ("00" + d.getSeconds()).slice(-2);

	data.slip_type = data.flag == 'returned' ? 'Return Slip Spares: Mechanic' : 'Issue Slip Spares: Mechanic'

    for (var key in data) {
        $scope[key] = data[key];
    }
	console.log($scope.client_full_name);

    var t1 = document.getElementById("t1");
    
    for (var i = 0; i < data.issued_spare.length; i++) {
        var row = t1.insertRow(i + 1);
        for (var j = 0; j < headers.length; j++) {
            row.insertCell(j);
            var value = data.issued_spare[i][headers[j]];
            
            switch(j) {
				case 0:
				value = j+1;
				break;
				case 7:
				value = data.issued_spare[i][headers[5]] * data.issued_spare[i][headers[6]];
                totalData = totalData+value;
				break;
			}


            row.cells[j].innerHTML = value !== undefined ? value : '';
            row.cells[j].className += 'data ctd calign';
        }
    }

    
    $scope["totalData"] = totalData;
    console.log("Total Amount:"+totalData);
    


});
