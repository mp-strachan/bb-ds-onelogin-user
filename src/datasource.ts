import {IntegrationBase} from "@budibase/types"
import fetch from "node-fetch"

interface Query {
  method: string
  body?: string
  headers?: { [key: string]: string }
}

class CustomIntegration implements IntegrationBase {
  private readonly baseDomain: string
  private readonly clientID: string
  private readonly clientSecret: string
  private oauthToken: string

  async constructor(config: { url: string, clientID: string, clientSecret: string }) {
    this.baseDomain = "https://" + config.url + ".onelogin.com"
    this.clientID = config.clientID
    this.clientSecret = config.clientSecret
  }


  async request(url: string, opts: Query) {
    const response = await fetch(url, opts)
    if (response.status <= 300) {
      try {
        const contentType = response.headers.get("content-type")
        if (contentType?.includes("json")) {
          return await response.json()
        } else {
          return await response.text()
        }
      } catch (err) {
        return await response.text()
      }
    } else {
      const err = await response.json()
      throw new Error(`${err.message} (Code: ${err.statusCode})`)
    }
  }


  async getAuthToken() {
    //https://<subdomain>.onelogin.com/auth/oauth2/v2/token
    const uri = this.baseDomain + "/auth/oauth2/v2/token";

    const headers =
        {
          "Content-Type": "application/json",
          "Authorization": "client_id:" + this.clientID + ", client_secret:" + this.clientSecret
        };

    const body =
        {
          grant_type: 'client_credentials'
        };

    const options = {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body)
    };

    let result = {"access_token": ""};
    try {
      result = await this.request(uri, options)
      return result.access_token;
    } catch (err) {
      return await this.request(uri, options);
    }
  }


  async create(query: { username: string, email: string, payload: string }) {
    let bodyJSON: object;
    let body: string;

    if (typeof query.username === 'undefined' || query.username === '') {
      throw new Error("Field 'username' is required")
    }

    if (typeof query.email === 'undefined' || query.email === '') {
      throw new Error("Field 'email' is required")
    }

    if (typeof query.payload === 'undefined' || query.payload === '') {
      throw new Error("Query cannot be blank")
    }

    bodyJSON = JSON.parse(query.payload);
    bodyJSON.email = query.email;
    bodyJSON.username = query.username;
    body = JSON.stringify(bodyJSON, null, 2);

    try {
      this.oauthToken = await this.getAuthToken();
      let uri: string = this.baseDomain + "/api/2/users";
      const headers = { "Content-Type": "application/json", "Authorization": "bearer " + this.oauthToken };
      const options = { method: "POST", headers: headers, body: body };
      return await this.request(uri, options);
    } catch (err) {
      throw new Error(err)
    }
  }


  async read(query: { id: string, fields: string, scopeFilter: string}) {
    let uri: string = "";
    let path: string;
    let queries: string = "";
    let hasFields: boolean = false;

    if (query.id === "" || query.id === "0" || typeof query.id === 'undefined') {
      path = "/api/2/users";
    } else {
      const userID: number = +query.id;
      path = "/api/2/users/" + userID.toString();
    }

    if (query.fields !== "" && typeof query.fields !== 'undefined') {
      queries = "?fields=" + query.fields;
      hasFields = true;
    }

    if (query.scopeFilter !== "" && typeof query.scopeFilter !== 'undefined') {
      path = "/api/2/users";
      queries += ((hasFields) ? "&" : "?") + query.scopeFilter;
    }

    try {
      uri = this.baseDomain + path + queries;
      this.oauthToken = await this.getAuthToken();
      const headers = { "Content-Type": "application/json", "Authorization": "bearer " + this.oauthToken };
      const options = { method: "GET", headers: headers };
      return await this.request(uri, options);
    } catch (err) {
      throw new Error(err)
    }
  }


  async update(query: { id: number, payload: string }) {
    let id: string = query.id.toString();
    let body: string;

    if (typeof query.id === 'undefined') {
      throw new Error("User ID cannot be blank");
    }

    if (typeof query.payload === 'undefined' || query.payload === '') {
      throw new Error("Query cannot be blank");
    }

    body = JSON.stringify(JSON.parse(query.payload), null, 2);

    try {
      this.oauthToken = await this.getAuthToken();
      let uri: string = this.baseDomain + "/api/2/users/" + id;
      const headers = { "Content-Type": "application/json", "Authorization": "bearer " + this.oauthToken };
      const options = { method: "PUT", headers: headers, body: body };
      return await this.request(uri, options);
    } catch (err) {
      throw new Error(err)
    }
  }

  async delete(query: { id: string }) {
    try {
      this.oauthToken = await this.getAuthToken();
      let uri: string = this.baseDomain + "/api/2/users/" + query.id;
      const headers = { "Content-Type": "application/json", "Authorization": "bearer " + this.oauthToken };
      const options = { method: "DELETE", headers: headers };
      return await this.request(uri, options);
    } catch (err) {
      throw new Error(err)
    }
  }
}

export default CustomIntegration
