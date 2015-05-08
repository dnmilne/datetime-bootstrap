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
