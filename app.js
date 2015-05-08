var app = angular.module('app', ["datetime.bootstrap", "hljs"])


.controller('Ctrl', ['$scope','DateData', function($scope, DateData) {

	$scope.configs = {
		date: { within: '14 days' },
		time: {}
	} 

	$scope.values = {date:[], time:[]} ;

}]) ;