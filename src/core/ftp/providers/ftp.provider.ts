import { Client, AccessOptions, UploadOptions, FTPResponse } from 'basic-ftp';
import { LogLevel, Logger } from '@nestjs/common';

import { ENV_VARIABLES } from '@/common/config/env.config';

export class FtpProviders {
  private readonly _client: Client;
  private readonly _options: AccessOptions = {
    host: ENV_VARIABLES.FTP_HOST,
    port: ENV_VARIABLES.FTP_PORT,
    password: ENV_VARIABLES.FTP_PWD,
    user: ENV_VARIABLES.FTP_USER,
    secure: false,
  };
  private readonly _logger: Logger;

  constructor() {
    this._client = new Client();
    this._logger = new Logger(FtpProviders.name);
    const logLevels = ['log', 'error'];
    const verboseLogLeves = [...logLevels, 'verbose', 'debug'];
    this._logger.localInstance.setLogLevels(
      (ENV_VARIABLES.DEBUG ? verboseLogLeves : logLevels) as LogLevel[],
    );
    this._logger.log('FTP Client initialized');
  }

  private async connect() {
    this._logger.debug('Connecting to FTP server');
    return await this._client.access(this._options);
  }

  /**
   * List files inside a certain directory
   * keep path empty to list the root folder of the ftp
   * @param path Path for the directory to list
   * @returns
   */
  async list(path?: string) {
    try {
      await this.connect();
      this._logger.verbose(
        `Listing files from ftp ${path && 'on path: ' + path}`,
      );
      return await this._client.list(path);
    } catch (err) {
      this._logger.error(err);
      this._client.close();
      throw err;
    } finally {
      this._client.close();
    }
  }

  /**
   * upload a file or readable to ftp
   * @param source path to the file to upload or a readable file
   * @param toRemotePath path to save your file
   * @param options
   * @returns
   */
  async upload(source: string, destination: string, options?: UploadOptions) {
    try {
      this._logger.log('Uploading file to ftp');
      this._logger.verbose(JSON.stringify({ source, destination, options }));
      await this.connect();
      return await this._client.uploadFrom(source, destination, options);
    } catch (err) {
      this._logger.error(err);
      this._client.close();
      throw err;
    } finally {
      this._client.close();
    }
  }

  /**
   * delete a file in the ftp
   * @param fileRemotePath path to the deleted file
   * @returns
   */
  async delete(fileRemotePath: string): Promise<FTPResponse> {
    try {
      this._logger.log('Deleting file from ftp');
      this._logger.verbose(JSON.stringify({ fileRemotePath }));
      await this._client.access(this._options);
      return await this._client.remove(fileRemotePath);
    } catch (err) {
      this._logger.error(err);
      this._client.close();
      throw err;
    } finally {
      this._client.close();
    }
  }
}
