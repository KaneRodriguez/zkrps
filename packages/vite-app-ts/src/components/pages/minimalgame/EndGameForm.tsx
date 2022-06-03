import React, { FC } from 'react';

import { Button, Select, Form } from 'antd';

export interface IEndGameFormProps {
    onSubmit: any,
    gameTimeRemaining: string
}

export const EndGameForm: FC<IEndGameFormProps> = (props) => {
    const [form] = Form.useForm();

    const onFinish = (values: any) => {
        props.onSubmit()
    };

    return (
        <div>
            <Form form={form} onFinish={onFinish} initialValues={{}}>
                <Form.Item>
                    <div>Waiting for other player to reveal. </div>
                    {
                        props.gameTimeRemaining == ''
                            ? <div>
                                <div>Would you like to end the game?</div>
                                <Button type="primary" htmlType="submit">
                                    End Game
                                </Button>
                            </div>
                            : <div>They have {props.gameTimeRemaining} to respond.</div>
                    }
                </Form.Item>
            </Form>
        </div >
    );
}
