angular.module('datetime.bootstrap.directives', ['ui.bootstrap'])

/*
.directive('stopPropagation', function(){
	return {
		link: function($scope, element, attrs) {
			function prevent($event) {
			    $event.stopPropagation();
			}

			element.on('click', prevent) ;
		}
	}
}) */

.directive('forceDigits', function(){
   	return {
     	require: 'ngModel',
     	link: function($scope, element, attrs, modelCtrl) {

     		var digits = attrs.forceDigits ;
     		var clearZero = ('clearZero' in attrs) ;

      		modelCtrl.$parsers.push(function (inputValue) {

		       	//strip non-digits
		        var transformedInput = inputValue.replace(/\D/g, ''); 

		        //truncate
				transformedInput = transformedInput.substr(transformedInput.length - digits);

				//pad
		        transformedInput = _.padLeft(transformedInput, digits, '0') ;

		        if (clearZero && Number(transformedInput) == 0)
		        	transformedInput = undefined ;

		        if (transformedInput!=inputValue) {
		        	modelCtrl.$setViewValue(transformedInput);
		        	modelCtrl.$render();
		        }

	         	return transformedInput;         
       		});
    	}
   	}
})

.directive('forcePeriod', function(){
   	return {
     	require: 'ngModel',
     	link: function($scope, element, attrs, modelCtrl) {

     		var digits = attrs.forceDigits ;

      		modelCtrl.$parsers.push(function (inputValue) {

		        var transformedInput = inputValue.toLowerCase() ;

		        if (_.endsWith(transformedInput, 'p'))
		        	transformedInput = 'pm' ;
		        else if (_.endsWith(transformedInput, 'a'))
		        	transformedInput = 'am' ;
		        else if (_.startsWith(transformedInput, 'p'))
		        	transformedInput = 'pm' ;
		        else if (_.startsWith(transformedInput, 'a'))
		        	transformedInput = 'am' ;
		        else {
		        	transformedInput = undefined ;
		        }

		        if (transformedInput!=inputValue) {
		        	modelCtrl.$setViewValue(transformedInput);
		        	modelCtrl.$render();
		        }

	         	return transformedInput;         
       		});
    	}
   	}
})



.directive('inFocus', ['$log', '$timeout', function($log, $timeout) {
	return {
		scope: {
	        inFocus: '=',
	    },
		link: function($scope, element, attrs) {

			$scope.blurPromise ;

			$scope.prevent = function($event) {
			    $event.stopPropagation();
			    $event.preventDefault();
			};

		    $scope.focus = function($event) {
		      	$scope.prevent($event);

		      	$scope.$apply(function() {
		      		$scope.inFocus = true ;
		      	}) ;
		    };

		    $scope.blur = function($event) {

		      	$scope.prevent($event);

		      	if ($scope.blurPromise)
		      		$timeout.cancel($scope.blurPromise) ;

		      	//take a little while to loose focus
		      	$scope.blurPromise = $timeout(
		      		function() {
			      		$scope.$apply(function() {
			      			$scope.inFocus = false ;
			      		}) ;
			      	}, 
			      	200
		      	); 
		      	
		    };

		    element.on('click', $scope.prevent) ;
		    element.on('focus', $scope.focus) ;
		    element.on('blur', $scope.blur) ;
		}
	}
}])



.directive('dateInput', ['$log', '$timeout', 'DateData', function ($log, $timeout, DateData) {

	return {
		restrict: 'E',
		scope: {
			date:'=',
			config:'=?'
		},
		templateUrl: "datetime.bootstrap.date.tmpl.html",
		link: function ($scope, element, attrs) {

			$scope.units = {} ;
			
			//records which fields are in focus
			$scope.focii = {} ;

			//records which dropdowns are shown
			$scope.drops = {
				day:false,
				month:false,
				year:false,
				date:false
			} ;

			$scope.$watch('config', function() {

				//update stored data about available days, months, etc

				$scope.data = {} ;

				$scope.data.dates = DateData.getDates($scope.config) ;

				if (!$scope.data.dates) {
					$scope.data.years = DateData.getYears($scope.config) ;
					$scope.data.months = DateData.getMonths() ;
					$scope.data.days = DateData.getDays($scope.units.month, $scope.units.year) ;
				}

			}, true) ;

			$scope.$watch('date', function() {

				if (!hasConflict())
					return ;

				if (!$scope.date) {
					$scope.units = {} ;
					return ;
				}

				$scope.units.day = _.padLeft($scope.date[2], 2, '0') ;
				$scope.units.month = _.padLeft($scope.date[1], 2, '0') ;
				$scope.units.year = _.padLeft($scope.date[0], 4, '0') ;

			}, true) ; 

			$scope.$watch('units', function() {

				//immediately update day dropdown

				if (!$scope.data.dates)
					$scope.data.days = DateData.getDays($scope.units.month, $scope.units.year) ;

				if (!hasConflict())
					return ;

				//update date value

				if (!$scope.units.day || !$scope.units.month || !$scope.units.year) {
					$scope.date = [null,null,null] ;
				} else {

					var units = getUnitsArray() ;
	
					if (moment([units[0], units[1]-1, units[2]]).isValid()) 
						$scope.date = units ;
					
				}

				//cancel any previously scheduled tidyup

				if ($scope.tidyPromise)
					$timeout.cancel($scope.tidyPromise) ;

				//tidy up
				$scope.tidyPromise = $timeout(tidyup, 1000) ;
				
			}, true) ;


			$scope.$watch('focii', function() {

				//calculate which dropdowns to show or hide

				$scope.drops.day = ($scope.focii.day && $scope.data.days != null) ;
				$scope.drops.month = ($scope.focii.month && $scope.data.months != null) ;
				$scope.drops.year = ($scope.focii.year && $scope.data.years != null) ;

				$scope.drops.date = (($scope.focii.day || $scope.focii.month || $scope.focii.year) && $scope.data.dates != null) ;

			}, true) ;

			$scope.setDate = function(date) {

				//sets all units at once

				var m = moment(date) ;

				$scope.units.day = _.padLeft(m.date(), 2, '0') ;
				$scope.units.month = _.padLeft(m.month(), 2, '0') ;
				$scope.units.year = _.padLeft(m.year(), 4, '0') ;
			}

			function tidyup() {

				//forces date to be within legal range

				if ($scope.units.month != null) {
					if (Number($scope.units.month) < 1)
						$scope.units.month = '01' ;

					if (Number($scope.units.month) > 12)
						$scope.units.month = '12' ;
				}

				if ($scope.units.day != null) {
					if (Number($scope.units.day) < 1)
						$scope.units.day > 1 ;

					$scope.units.day = DateData.truncateDayIfNeeded($scope.units.day, $scope.units.month, $scope.units.year) ;
				}
			}

			function getUnitsArray() {

				var units = [null,null,null] ;

				if ($scope.units.year) 
					units[0] = Number($scope.units.year) ;

				if ($scope.units.month)
					units[1] = Number($scope.units.month) ;

				if ($scope.units.day)
					units[2] = Number($scope.units.day) ;

				return units ;
			}

			function hasConflict() {

				//returns true if there is any miss-match between date and units

				var units = getUnitsArray() ;

				//if the date is blank, at least one of the units should be blank
				if (!$scope.date || !$scope.date[0] && !$scope.date[1] && !$scope.date[2]) {
					
					if (!units[0] || !units[1] || !units[2])
						return false ;

					return true ;
				}


				//if ($scope.date[0] == null || $scope.date[1] == null || $scope.date[2] == null)
				//	return false;
				
				if ($scope.date[0] != units[0])
					return true ;

				if ($scope.date[1] != units[1])
					return true ;

				if ($scope.date[2] != units[2])
					return true ;

				return false ;
			}

		}
	}

}]) 


.directive('timeInput', ['$log', '$timeout', 'TimeData', function ($log, $timeout, TimeData) {

	var defaultConfig = {
		showMinutes: true,
		showSeconds: false,
		minuteAccuracy: 15,
		secondAccuracy: 15
	}


	return {
		restrict: 'E',
		scope: {
			time:'=',
			config:'=?'
		},
		templateUrl: "datetime.bootstrap.time.tmpl.html",
		link: function ($scope, element, attrs) {

			$scope.cfg = _.clone(defaultConfig) ;

			$scope.units = {period:'am'} ;
			
			//records which fields are in focus
			$scope.focii = {} ;

			//records which dropdowns are shown
			$scope.drops = {
				hour:false,
				minute:false,
				period:false
			} ;

			$scope.$watch('config', function() {

				//combine with default config

				$scope.cfg = {}

				//merge config and default
				if (!$scope.config) {
					$scope.cfg = _.clone(defaultConfig) ;
				} else {

	          		$scope.cfg = _.clone($scope.config) ;

	          		//remove any chance of infinite loops
	          		if ($scope.cfg.minuteAccuracy < 1)
	          			$scope.cfg.minuteAccuracy = undefined ;

	          		if ($scope.cfg.secondAccuracy < 1)
	          			$scope.cfg.secondAccuracy = undefined ;

	          		_.each(defaultConfig, function(value, key) {
			            if ($scope.cfg[key] === null || $scope.cfg[key] === undefined)
			            	$scope.cfg[key] = value ;
			        }) ;
			        
				}

				//update stored data about available hours, minutes, etc
				$scope.data = {} ;

				$scope.data.hours = TimeData.getHours() ;
				$scope.data.minutes = TimeData.getMinutes($scope.cfg) ;
				$scope.data.seconds = TimeData.getSeconds($scope.cfg) ;
				$scope.data.periods = TimeData.getPeriods() ;

			}, true) ;

			
			$scope.$watch('time', function() {

				if (!hasConflict())
					return ;

				if (!$scope.time) {
					$scope.units = {period:'am'} ;
					return ;
				}

				//var m = moment().hour($scope.time[0]-1) ;

				if ($scope.time[0] == null) {
					$scope.units.hour = undefined ;
					$scope.units.period = 'am' ;
				} else {
					$scope.units.hour = ($scope.time[0] <=12) ? $scope.time[0] : $scope.time[0]-12 ;
					$scope.units.period = ($scope.time[0] <12 || $scope.time[0] > 23) ? 'am' : 'pm' ;
				}

				if ($scope.time[1] == null) 
					$scope.units.minute = undefined ;
				else
					$scope.units.minute = _.padLeft($scope.time[1], 2, '0') ;

				if ($scope.time[2] == null)
					$scope.units.minute = undefined ;
				else
					$scope.units.second = _.padLeft($scope.time[2], 2, '0') ;

			}, true) ; 

			$scope.$watch('units', function() {

				if (!hasConflict())
					return ;

				//update time value
				$scope.time = TimeData.toArray($scope.units) ;

				//cancel any previously scheduled tidyup
				if ($scope.tidyPromise)
					$timeout.cancel($scope.tidyPromise) ;

				//tidy up
				$scope.tidyPromise = $timeout(tidyup, 1000) ;
				
				
			}, true) ;

			function tidyup() {

				if ($scope.units.hour != null) {

					var h = ($scope.units.hour==null) ? null : Number($scope.units.hour) ;

					if (h > 24) h = 24 ;

					if (h > 12) {
						h = h - 12 ;
						$scope.units.period = 'pm' ;
					}

					$scope.units.hour = h ;
				}

				if ($scope.units.minute) {
					if (Number($scope.units.minute) > 59)
						$scope.units.minute = 59 ;
				}

				if ($scope.units.second) {
					if (Number($scope.units.second) > 59)
						$scope.units.second = 59 ;
				}

			}


			function hasConflict() {

				//returns true if there is any miss-match between date and units

				var units = TimeData.toArray($scope.units);

				//if the time is blank, at least hour unit should be blank
				if (!$scope.time || (!$scope.time[0] && !$scope.time[1] && !$scope.time[2])) {
					
					if (!units[0])
						return false ;

					return true ;
				}
				
				if ($scope.time[0] != units[0])
					return true ;

				if ($scope.time[1] != units[1])
					return true ;

				if ($scope.time[2] != units[2])
					return true ;

				return false ;
			}

		}
	}
}])
