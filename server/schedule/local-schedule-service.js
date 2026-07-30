'use strict';

class LocalScheduleService {
  constructor({
    repository,
    runner,
    arduinoScheduleService
  } = {}) {
    if (
      !repository ||
      !runner ||
      !arduinoScheduleService
    ) {
      throw new TypeError(
        'A LocalScheduleService minden függősége kötelező.'
      );
    }

    this.repository =
      repository;
    this.runner =
      runner;
    this.arduinoScheduleService =
      arduinoScheduleService;
  }

  list() {
    return this.repository
      .list();
  }

  create(input) {
    return this.repository
      .create(input);
  }

  update(id, input) {
    return this.repository
      .update(
        id,
        input
      );
  }

  remove(id) {
    return this.repository
      .remove(id);
  }

  import(input) {
    return this.repository
      .replaceAll(input);
  }

  export() {
    return this.repository
      .exportDocument();
  }

  async syncArduino() {
    const schedules =
      await this.repository
        .list();

    return this
      .arduinoScheduleService
      .sync(schedules);
  }

  runnerStatus() {
    return this.runner
      .getStatus();
  }

  tick(options = {}) {
    return this.runner
      .tick(options);
  }
}

module.exports = {
  LocalScheduleService
};
