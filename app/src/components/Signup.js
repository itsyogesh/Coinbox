import React, { Component } from 'react'
import { Header, Form, Input, Button, Segment } from 'semantic-ui-react'
import { Link } from 'react-router-dom'
import { Redirect } from 'react-router-dom'

import FormPage from './FormPage'

class Signup extends Component {
  render() {
    if(this.props.isAuthenticated) return (
      <Redirect to='/' />
    )
    else {
      return (
        <FormPage centered>
          <Header as='h1' textAlign='center'>Create your Account</Header>
          <p className='text-center'>By signing up, you agree to all the terms and conditions</p>
            <Form className='margin-top'>
              <Form.Group widths='equal'>
                <Form.Field>
                  <Input placeholder='First name' required />
                </Form.Field>
                <Form.Field>
                  <Input placeholder='Last name' required />
                </Form.Field>
              </Form.Group>
              <Form.Field>
                <Input type='email' placeholder='Email address' />
              </Form.Field>
              <Form.Group widths='equal'>
                <Form.Field>
                  <Input type='password' placeholder='Password' />
                </Form.Field>
                <Form.Field>
                  <Input type='password' placeholder='Retype Password' />
                </Form.Field>
              </Form.Group>

              <Segment basic padded textAlign='center'>
                <Button primary size='large'>Create my account</Button>
                  <h5 className='text-center'>
                    If you already have an account, please <Link to='/login'>login</Link> here.
                  </h5>
              </Segment>
            </Form>
        </FormPage>
      )
    }
  }
}

export default Signup
