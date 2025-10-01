
export default class WorldTime {

  constructor(initHours = 0, initMinutes = 0, initSeconds = 0, initMonth = 1, initDay = 1, initYear = 2024, timeScale = 200) {
    this.seconds = initSeconds;
    this.minutes = initMinutes;
    this.hours = initHours;
    this.month = initMonth;
    this.day = initDay;
    this.year = initYear;
    this.timeScale = timeScale;

    this.startDatetTime = new Date(this.year, this.month-1, this.day, this.hours, this.minutes, this.seconds);
    this.velocity = 0;
    this.acceleration = 0;
  }


  run(deltaTime) {
    this.seconds += deltaTime;
  
    // Handle forward time increment
    while (this.seconds >= 60) {
      this.seconds -= 60;
      this.minutes++;
    }
  
    // Handle backward time decrement
    while (this.seconds < 0) {
      this.seconds += 60;
      this.minutes--;
    }
  
    while (this.minutes >= 60) {
      this.minutes -= 60;
      this.hours++;
    }
  
    while (this.minutes < 0) {
      this.minutes += 60;
      this.hours--;
    }
  
    while (this.hours >= 24) {
      this.hours -= 24;
      this.day++;
    }
  
    while (this.hours < 0) {
      this.hours += 24;
      this.day--;
    }
  
    // Adjust days and months forward
    while (this.day > this.daysInMonth(this.month, this.year)) {
      this.day -= this.daysInMonth(this.month, this.year);
      this.month++;
      if (this.month > 12) {
        this.month = 1;
        this.year++;
      }
    }

  
    // Adjust days and months backward
    while (this.day < 1) {
      this.month--;
      if (this.month < 1) {
        this.month = 12;
        this.year--;
      }
      this.day += this.daysInMonth(this.month, this.year);
    }
  }


  calculateVelocity() {
    const newDateTime = new Date(this.year, this.month-1, this.day, this.hours, this.minutes, this.seconds);
    const timeDifference = (newDateTime - this.startDatetTime) / 1000;
    this.velocity = timeDifference;
  }


  reset() {
    this.setSpecificTime(0, 0, 0, 1, 1, 1974);
  }


  daysInMonth(month, year) {
    return new Date(year, month, 0).getDate();
  }


  getFormattedTime(includeDate = false) {
    const formattedTime = `${this.hours.toString().padStart(2, '0')}:${this.minutes.toString().padStart(2, '0')}:${Math.floor(this.seconds).toString().padStart(2, '0')}`;

    if (includeDate) {
      return `${this.month}/${this.day}/${this.year} ${formattedTime}`;
    } else {
      return formattedTime;
    }
  }


  setHours(value) {
    if (value < 0 || value >= 24) {
      this.hours = Math.max(0, Math.min(value, 23));
    } else {
      this.hours = value;
      this.calculateVelocity();
    }
  }

  setMinutes(value) {
    if (value < 0 || value >= 60) {
      this.minutes = Math.max(0, Math.min(value, 59));
    } else {
      this.minutes = value;
      this.calculateVelocity();
    }
  }

  setSeconds(value) {
    if (value < 0 || value >= 60) {
      this.seconds = Math.max(0, Math.min(value, 59));
    } else {
      this.seconds = value;
      this.calculateVelocity();
    }
  }

  setMonth(value) {
    if (value < 1 || value > 12) {
      this.month = Math.max(1, Math.min(value, 12));
    } else {
      this.month = value;
      this.calculateVelocity();
    }
  }

  setDay(value) {
    const maxDay = this.daysInMonth(this.month, this.year);
    if (value < 1 || value > maxDay) {
      this.day = Math.max(1, Math.min(value, maxDay));
    } else {
      this.day = value;
      this.calculateVelocity();
    }
  }

  setYear(value) {
    const maxYear = 2025
    if (value < 1 || value > maxYear) {
      this.year = Math.max(1, Math.min(value, maxYear));
    } else {
      this.year = value;
      this.calculateVelocity();
    }
  }


  setSpecificTime(newHours = 0, newMinutes = 0, newSeconds = 0, newMonth = 1, newDay = 1, newYear = 2024) {
    this.hours = newHours;
    this.minutes = newMinutes;
    this.seconds = newSeconds;
    this.month = newMonth;
    this.day = newDay;
    this.year = newYear;
    this.calculateVelocity();
  }


  setCurrentTime() {
    const now = new Date();
    this.hours = now.getHours();
    this.minutes = now.getMinutes();
    this.seconds = now.getSeconds();
    this.month = now.getMonth() + 1; // JavaScript months are 0-based
    this.day = now.getDate();
    this.year = now.getFullYear();
    this.calculateVelocity();
  }


  setTimeScale(value) {
    this.timeScale = value;
  }


  update(deltaTime) {

    this.velocity += this.acceleration;
    this.acceleration = deltaTime.getDelta() * this.timeScale;

    if (this.year < 1974) {
      this.acceleration = 0;
      this.velocity = 0;
      this.timeScale = 0;
      this.reset();
    }


    this.run(this.acceleration);
  }


  display(isFinishedLoading) {
    if (isFinishedLoading) {
      const timeElement = document.getElementById("time-text");
      timeElement.classList.add("fade_out");
      timeElement.textContent = this.getFormattedTime(true);
    }
  }

}