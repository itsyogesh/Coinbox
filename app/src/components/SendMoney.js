import React, { Component } from 'react'
import { Container, Header, Form, Input, Segment } from 'semantic-ui-react'

import FormPage from '../components/FormPage'

class SendMoney extends Component {
  handleSubmit(e) {

  }

  handleChange(e) {

  }

  render () {
    return (
      <Container text className='block-container'>
        <Segment basic padded>
          <Header as='h3' textAlign='center'>Send Money</Header>
          <Form className='margin-top' onSubmit={this.handleSubmit}>
            <Form.Field>
              <Input
                type='email'
                name='email'
                placeholder='Email address'
                onChange={this.handleChange}
                />
            </Form.Field>
            <Form.Field>
              <Input
                type='password'
                name='password'
                placeholder='Password'
                onChange={this.handleChange}
                />
            </Form.Field>
            <Segment basic padded textAlign='center'>
              <Form.Button fluid primary size='large'>Send Money</Form.Button>
            </Segment>
          </Form>
        </Segment>
      </Container>
    )
  }
}

export default SendMoney
