# API

## User API `api/users/*`

- **User creation:** POST `/` with data in `application/json`:
```
Data : 
{
	'email', (String, required, unique, email validation)
	'password', (String, required)
	'company_name', (String)
	'owner_name', (String, required)
	'mobile', (Number, required)
	'alt_mobile', (Number)
	'office_address' (String, required)
	'addr_line_1', (String, required)
	'addr_line_2', (String)
	'area', (String, required)
	'city', (String, required) //City Service
	'district', (String)
	'landline', (Number)
	'pincode', (Number)
	'alt_contact' :
		{
			'name', (String)
			'mobile' (Number)
		},
	'pan_no', (Number)
	'type', (String, among ['cust', 'transport', 'pnm'])
	'noncust_details' :
		{
			'service_tax_no', (Number)
			'type', (String)
			'no_of_vehicles', (Number)
			'vehicle_type', (String)
			'no_of_franchisee', (Number)
			'cities', (Array(String))
		}, (only if type != 'cust')
		'profile_img', (String)
		'id_proof' , (String)
};
Responses :
200: {"status": "OK"},
500: {"status":"ERROR","error_messages":"<error messages>"}
```

## Auth API `/auth/*`

- **Login:** POST `/login` with data in `x-www-form-urlencoded` or `application/json`:
```
Data: {
	'email',
	'password'
};
Responses :
200: {"status":"OK","token":"<token_string>"},
401: {"status":"ERROR","error_message":"No such username"},
401: {"status":"ERROR","error_message":"Incorrect Credentials"}
401: {"message":"Missing credentials"}
```

- **Change password:** POST `/changepass` with data in `x-www-form-urlencoded` or `application/json`:
```
Header :
{
	'Authorization': <token string>
},
Data :
{
	'old_pass', (OLD password)
	'new_pass' (NEW password)
}
Responses :
200: {"status":"OK"},
401: {"status":"ERROR","code":401,"error_message":"Authentication Failed"},
500: {"status":"ERROR","error_message":"Invalid token"}
```

******************************************************************************************************************************
##icd city import example
 mongoimport -d truckngpsDevDB -c icdcities --type csv --file /home/ubuntu/node-server/test/icdCities.csv --headerline

******************************************************************************************************************************