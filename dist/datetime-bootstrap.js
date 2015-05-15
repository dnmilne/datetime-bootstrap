angular.module('datetime.bootstrap', ['datetime.bootstrap.directives','datetime.bootstrap.services','datetime.bootstrap.templates']);

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

angular.module('datetime.bootstrap.services', [])



.service('DateData', function() {

	var withinPattern = /^(\d+) ((day|week|month|year)s?)( ago)?$/i ;

	this.parseWithin = function(str) {

		if (!str)
			return ;

		var match = withinPattern.exec(str) ;

		if (!match)
			return  ;

		var within = {} ;

		var amount = match[1] ;
		var unit = match[2] ;
		var ago = match[4] ;

		if (ago) {
			//range is from now to past
			within.direction = "past" ;

			within.end = moment() ;
			within.start = moment().subtract(amount, unit) ;
		} else {
			within.direction = "future" ;

			within.start = moment() ;
			within.end = moment().add(amount, unit) ;
		}

		return within ;
	}

	
	//data for year dropdown
	this.getYears = function(config) {

		if (!config) return ;

		var within = this.parseWithin(config.within) ;

		if (!within) return ;

		var years = [] ;

		var startYear = within.start.year() ;
		var endYear = within.end.year() ;

		switch (within.direction) {

			case 'past': 

				for (var y=endYear ; y>=startYear ; y--)
					years.push({value:y, label:y}) ;

				break ;

			case 'future': 

				for (var y=startYear ; y<= endYear ; y++)
					years.push({value:y, label:y}) ;

				break ;
		}
		
		return years ;
	}


	//data for month dropdown
	this.getMonths = function() {

		//this one never changes, so cache and resuse.

		if (this.months)
			return this.months ;

		this.months = [] ;
		
		_.each(moment.months(), function(monthName, index) {

			var val = _.padLeft((index+1), 2, '0') ;

			this.push({value:val, label:monthName}) ;
		}, this.months) ;

		return this.months ;
	}

	//data for day dropdown
	this.getDays = function(month, year) {

		var maxDay = getMaxDayForMonth(month, year) ;

		var days = [] ;

		for (var d=1 ; d<=maxDay ; d++) {

			var val = _.padLeft(d, 2, '0') ;

			days.push({value:val, label:val}) ;
		}

		return days ;
	}

	//data for combined dates dropdown
	this.getDates = function(config) {

		if (!config) return ;

		var within = this.parseWithin(config.within) ;

		if (!within)
			return ;

		var dayCount = Math.abs(within.end.diff(within.start, 'days')) ;

		if (dayCount > 32) {
			//too many days to reasonably show as a single dropdown
			return ;
		}

		var dates = [] ;

		switch (within.direction) {

			case 'past': 

				var m = moment() ;
				for (var i=0 ; i< dayCount ; i++){

					if (i==0)
						dates.push({value: m.format('YYYY-MM-DD'), label:'Today'}) ;
					else if (i == 1)
						dates.push({value: m.format('YYYY-MM-DD'), label:'Yesterday'}) ;
					else
						dates.push({value: m.format('YYYY-MM-DD'), label: m.format('MMM Do (ddd)')}) ;

					m.subtract(1, 'days') ;
				}

				break ;

			case 'future': 

				var m = moment() ;
				for (var i=0 ; i< dayCount ; i++){

					if (i==0)
						dates.push({value: m.format('YYYY-MM-DD'), label:'Today'}) ;
					else if (i == 1)
						dates.push({value: m.format('YYYY-MM-DD'), label:'Tomorrow'}) ;
					else
						dates.push({value: m.format('YYYY-MM-DD'), label: m.format('MMM Do (ddd)')}) ;

					m.add(1, 'days') ;
				}

				break ;
		}

		return dates ;

	}



	//provide a function for truncating day
	this.truncateDayIfNeeded = function(day, month, year) {

		var maxDay = getMaxDayForMonth(month, year)  ;

		if (day > maxDay) 
			return maxDay ;

		return day ;
	}


	function getMaxDayForMonth(month, year) {

		//assume january
		if (!month || month < 1 || month > 12)
			month = 1 ;

		//assume this year
		if (!year || year < 1000)
			year = moment().year() ;

		return moment(year + " " + month + " 01", 'YYYY MM DD').endOf('month').date() ;
	}



}) 



.service('TimeData', function() {

	this.getHours = function() {

		if (this.hours)
			return this.hours ;

		this.hours = [] ;

		for (var i = 1 ; i<=12 ; i++)
			this.hours.push({value:i, label:i}) ;

		return this.hours ;
	}

	this.getMinutes = function(config) {

		var minutes = [] ;

		var m = 0 ;
		while(m < 60) {
			minutes.push({value:_.padLeft(m, 2, '0'), label:_.padLeft(m, 2, '0')}) ;
			m = m + config.minuteAccuracy ;
		}
		
		return minutes ;
	}

	this.getSeconds = function(config) {

		var seconds = [] ;

		var s = 0 ;
		while(s < 60) {
			seconds.push({value:_.padLeft(s, 2, '0'), label:_.padLeft(s, 2, '0')}) ;
			s = s + config.secondAccuracy ;
		}
		
		return seconds ;
	}

	this.getPeriods = function() {

		if (this.periods)
			return this.periods ;

		this.periods = [
			{value:"am", label:'am'},
			{value:"pm", label:'pm'},
		] ;

		return this.periods ;
	}

	this.toArray = function(units) {

		//this could be called before or after tidyup

		var h = (units.hour == null) ? null : Number(units.hour) ;
		var m = (units.minute == null) ? null : Number(units.minute) ;
		var s = (units.second == null) ? null : Number(units.second) ;
		
		/*
		if (config.mode == 'duration') {

			//if everything is blank, then result is blank
			if (h == null && m == null && s == null)
				return [null,null,null] ;

			//otherwise all unset variables are 0
			if (h == null) h = 0 ;
			if (m == null) m = 0 ;
			if (s == null) s = 0 ;	

			//any out of range variables cause null result
			if (m > 59)
				return [null,null,null] ;

			if (s > 59)
				return [null,null,null] ;

			return [h, m, s] ; 

		} else {
		*/

		//if hour is blank, then result is blank
		if (h == null) 
			return [null, null, null] ;

		//otherwise unset variables are 0
		if (m == null) m = 0 ;
		if (s == null) s = 0 ;

		//any out of range variables cause null result
		if (h > 12 || h < 1)
			return [null, null, null] ;

		if (m > 59)
			return [null,null,null] ;

		if (s > 59)
			return [null,null,null] ;

		if (units.period == 'pm')
			h = h + 12 ;

		return [h, m, s] ;

	}



})

angular.module('datetime.bootstrap.templates', ['datetime.bootstrap.date.tmpl.html', 'datetime.bootstrap.time.tmpl.html']);

angular.module('datetime.bootstrap.date.tmpl.html', []).run(['$templateCache', function($templateCache) {
  'use strict';
  $templateCache.put('datetime.bootstrap.date.tmpl.html',
    '<div dropdown class=dropdown is-open=drops.date style="display: inline-block" auto-close=disabled dropdown-append-to-body><div class=form-control><div dropdown class=dropdown is-open=drops.day style="display: inline-block" auto-close=disabled dropdown-append-to-body><input class=internal-form-control ng-model=units.day placeholder=dd force-digits=2 clear-zero in-focus=focii.day style="width:2em ; text-align:center"><ul class=dropdown-menu role=menu style="max-height: 300px; overflow-y: auto"><li ng-repeat="d in data.days"><a role=menuitem ng-click="units.day = d.value">{{d.label}}</a></li></ul></div>&nbsp;/&nbsp;<div dropdown class=dropdown is-open=drops.month auto-close=disabled style="display: inline-block" dropdown-append-to-body><input class=internal-form-control ng-model=units.month placeholder=mm force-digits=2 clear-zero in-focus=focii.month style="width:2em ; text-align:center"><ul class=dropdown-menu role=menu style="max-height: 300px; overflow-y: auto"><li ng-repeat="m in data.months"><a role=menuitem ng-click="units.month = m.value" stop-propagation>{{m.label}}</a></li></ul></div>&nbsp;/&nbsp;<div dropdown class=dropdown is-open=drops.year auto-close=disabled style="display: inline-block" dropdown-append-to-body><input class=internal-form-control ng-model=units.year placeholder=yyyy force-digits=4 clear-zero in-focus=focii.year style="width:4em ; text-align:center"><ul class=dropdown-menu role=menu style="max-height: 300px; overflow-y: auto"><li ng-repeat="y in data.years"><a role=menuitem ng-click="units.year = y.value">{{y.label}}</a></li></ul></div></div><ul class=dropdown-menu role=menu><li ng-repeat="date in data.dates"><a role=menuitem tabindex=-1 ng-click=setDate(date.value)>{{date.label}}</a></li></ul></div>');
}]);

angular.module('datetime.bootstrap.time.tmpl.html', []).run(['$templateCache', function($templateCache) {
  'use strict';
  $templateCache.put('datetime.bootstrap.time.tmpl.html',
    '<div class=form-control><div dropdown class=dropdown is-open=focii.hour style="display: inline-block" auto-close=disabled dropdown-append-to-body><input class=internal-form-control ng-model=units.hour placeholder=hh force-digits=2 clear-zero in-focus=focii.hour style="width:2em ; text-align:center"><ul class=dropdown-menu role=menu style="max-height: 300px; overflow-y: auto"><li ng-repeat="h in data.hours"><a role=menuitem ng-click="units.hour = h.value">{{h.label}}</a></li></ul></div><div ng-if=cfg.showMinutes style=display:inline-block>&nbsp;:&nbsp;<div dropdown class=dropdown is-open=focii.minute auto-close=disabled style="display: inline-block" dropdown-append-to-body><input class=internal-form-control ng-model=units.minute placeholder=mm force-digits=2 in-focus=focii.minute style="width:2em ; text-align:center"><ul class=dropdown-menu role=menu style="max-height: 300px; overflow-y: auto"><li ng-repeat="m in data.minutes"><a role=menuitem ng-click="units.minute = m.value">{{m.label}}</a></li></ul></div></div><div ng-if="cfg.showMinutes && cfg.showSeconds" style=display:inline-block>&nbsp;:&nbsp;<div dropdown class=dropdown is-open=focii.second auto-close=disabled style="display: inline-block" dropdown-append-to-body><input class=internal-form-control ng-model=units.second placeholder=ss force-digits=2 in-focus=focii.second style="width:2em ; text-align:center"><ul class=dropdown-menu role=menu style="max-height: 300px; overflow-y: auto"><li ng-repeat="s in data.seconds"><a role=menuitem ng-click="units.second = s.value">{{s.label}}</a></li></ul></div></div>&nbsp;&nbsp;<div dropdown class=dropdown is-open=focii.period auto-close=disabled style="display: inline-block" dropdown-append-to-body><input class=internal-form-control ng-model=units.period force-period in-focus=focii.period style="width:2em ; text-align:center"><ul class=dropdown-menu role=menu style="max-height: 300px; overflow-y: auto"><li ng-repeat="p in data.periods"><a role=menuitem ng-click="units.period = p.value">{{p.label}}</a></li></ul></div></div>');
}]);
